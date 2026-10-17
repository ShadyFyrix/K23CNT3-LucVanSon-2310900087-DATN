const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

/**
 * Trình phân tích đề thi thông minh (Exam Document AI & Regex Parser)
 * Hỗ trợ bóc tách tự động:
 * - Số lượng câu hỏi
 * - Phân loại trắc nghiệm (MCQ) và tự luận (ESSAY)
 * - Tự động nhận diện đáp án đúng (*A., A*., [x] A., in đậm, gạch chân, hoặc BẢNG ĐÁP ÁN ở cuối file)
 * - Tự động nhận diện câu hỏi có nhiều đáp án đúng (Hộp kiểm Checkbox)
 */
async function parseExamFile(filePath, originalName = '') {
  const ext = path.extname(originalName || filePath).toLowerCase();
  let rawText = '';
  let htmlText = '';

  try {
    if (ext === '.docx' || ext === '.doc') {
      try {
        const textResult = await mammoth.extractRawText({ path: filePath });
        rawText = textResult.value || '';
      } catch (err) {
        console.warn('Lỗi extractRawText docx:', err.message);
      }

      try {
        const htmlResult = await mammoth.convertToHtml({ path: filePath });
        htmlText = htmlResult.value || '';
      } catch (_) {}
    } else if (ext === '.txt' || ext === '.json') {
      rawText = fs.readFileSync(filePath, 'utf-8');
    } else if (ext === '.pdf') {
      try {
        const pdfParseModule = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const uint8 = new Uint8Array(dataBuffer);

        if (pdfParseModule.PDFParse) {
          const parser = new pdfParseModule.PDFParse({ data: uint8 });
          const textResult = await parser.getText();
          rawText = (textResult && textResult.text) ? textResult.text : (typeof textResult === 'string' ? textResult : '');
        } else if (typeof pdfParseModule === 'function') {
          const res = await pdfParseModule(uint8);
          rawText = res.text || '';
        } else if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
          const res = await pdfParseModule.default(uint8);
          rawText = res.text || '';
        }
      } catch (pdfErr) {
        console.warn('Lỗi đọc văn bản PDF (có thể là file scan dạng ảnh):', pdfErr.message);
      }
    }
  } catch (readErr) {
    console.warn('Lỗi đọc file đề thi:', readErr.message);
  }

  // Nếu không trích xuất được văn bản (ví dụ file ảnh scan PNG/JPG hoặc PDF ảnh)
  if (!rawText || rawText.trim().length < 20) {
    return {
      canParseText: false,
      message: 'Tệp dạng ảnh scan hoặc không chứa văn bản thuần. Hệ thống sẽ giữ nguyên tệp để thí sinh xem trực quan.'
    };
  }

  const parsed = parseExamContent(rawText, htmlText);
  return {
    canParseText: true,
    ...parsed
  };
}

function parseExamContent(rawText, htmlText = '') {
  const result = {
    detectedQuestionsCount: 0,
    mcqCount: 0,
    essayCount: 0,
    hasAnswers: false,
    quickAnswerString: '',
    metadata: {},
    questions: []
  };

  if (!rawText || !rawText.trim()) return result;

  // 1. Kiểm tra bảng đáp án ở cuối đề thi
  const answerKeyMap = new Map();
  const answerBlockRegex = /(?:^|\n)\s*(?:BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN|HƯỚNG\s+DẪN\s+CHẤM|ANSWER\s+KEY|KEY\s+ĐÁP\s+ÁN)[\s\S]*$/i;
  const answerBlockMatch = rawText.match(answerBlockRegex);

  if (answerBlockMatch) {
    const keyBlock = answerBlockMatch[0];
    // Regex bắt chính xác từng cặp câu hỏi - đáp án, tránh bị nuốt chữ 'C' của từ 'Câu'
    const pairRegex = /(?:^|\s|Câu\s*|\b)(\d+)\s*[:.\-\/|]?\s*([A-E](?:\s*,\s*[A-E])*|TL|TU_LUAN|ESSAY)(?=[^A-Za-z0-9]|$|Câu|\d)/gi;
    let match;
    while ((match = pairRegex.exec(keyBlock)) !== null) {
      const qNum = parseInt(match[1]);
      const val = match[2].toUpperCase();
      if (val === 'TL' || val === 'TU_LUAN' || val === 'ESSAY') {
        answerKeyMap.set(qNum, { answers: [], isEssay: true });
      } else {
        const letters = val.replace(/[^A-E]/gi, '').toUpperCase();
        const indices = [];
        for (const ch of letters) {
          const code = ch.charCodeAt(0) - 65;
          if (code >= 0 && code <= 4 && !indices.includes(code)) {
            indices.push(code);
          }
        }
        if (indices.length > 0) {
          answerKeyMap.set(qNum, { answers: indices.sort((a, b) => a - b), isEssay: false });
        }
      }
    }
  }

  // 1.1 Trích xuất siêu dữ liệu tổng quan của đề thi (Metadata)
  const codeMatch = rawText.match(/Mã\s*đề\s*[:.\-]?\s*([A-Za-z0-9_-]+)/i);
  const rawSubject = rawText.match(/(?:Tên\s*học\s*phần|Học\s*phần|Môn\s*học)\s*[:.\-]?\s*([^\n\r]+)/i);
  const cleanSubject = rawSubject ? rawSubject[1].replace(/^(?:Tên\s*học\s*phần|Học\s*phần|Môn\s*học)\s*[:.\-]?\s*/i, '').trim() : null;
  const durationMatch = rawText.match(/Thời\s*gian(?:\s*làm\s*bài)?\s*[:.\-]?\s*(\d+)/i);
  const formMatch = rawText.match(/Hình\s*thức(?:\s*làm\s*bài)?\s*[:.\-]?\s*([^\n\r]+)/i);
  const titleMatch = rawText.match(/(?:ĐỀ\s+THI[^\n\r]+)/i);

  result.metadata = {
    code: codeMatch ? codeMatch[1].trim() : null,
    subject: cleanSubject,
    duration: durationMatch ? parseInt(durationMatch[1]) : null,
    form: formMatch ? formMatch[1].trim() : null,
    title: titleMatch ? titleMatch[0].trim() : null
  };

  // 2. Cắt bỏ khối đáp án và phân tách mã đề đầu tiên nếu tài liệu chứa nhiều mã đề
  let questionBody = rawText;
  if (answerBlockMatch && answerBlockMatch.index > 50) {
    questionBody = rawText.substring(0, answerBlockMatch.index);
  }

  // Nếu đề thi chứa nhiều mã đề (VD: Mã đề 01 rồi đến HẾT, sau đó sang Mã đề 02)
  const hetDelimiterMatch = questionBody.match(/(?:^|\n)\s*-+\s*HẾT\s*-+/i);
  if (hetDelimiterMatch && hetDelimiterMatch.index > 80) {
    questionBody = questionBody.substring(0, hetDelimiterMatch.index);
  }

  // 3. Nhận diện vị trí bắt đầu của phần Tự luận (nếu có)
  let essayStartIndex = Infinity;
  const essaySectionRegex = /(?:^|\n)\s*(?:PHẦN\s+(?:II|2)|(?:PHẦN|B|II)[\.\:\-]\s*TỰ\s+LUẬN|CÂU\s+HỎI\s+TỰ\s+LUẬN)/i;
  const essaySectionMatch = questionBody.match(essaySectionRegex);
  if (essaySectionMatch) {
    essayStartIndex = essaySectionMatch.index;
  }

  // 4. Nhận diện vị trí bắt đầu của mỗi câu hỏi / bài tập:
  // Hỗ trợ: "Câu 1:", "Question 1:", "Bài 1 (3 điểm):", "Bài 2 (7 điểm):", "1. "
  const qHeaderRegex = /(?:^|\n)\s*(?:(Câu|Question|Bài))\s*(\d+)(?:\s*\(([^)]+)\))?[:.-]?/gi;
  const matches = [];
  let m;
  while ((m = qHeaderRegex.exec(questionBody)) !== null) {
    matches.push({
      prefix: m[1],
      isBai: m[1].toLowerCase() === 'bài',
      qNum: parseInt(m[2]),
      scoreStr: m[3] ? m[3].trim() : null,
      index: m.index,
      headerLength: m[0].length
    });
  }

  if (matches.length === 0) {
    const numHeaderRegex = /(?:^|\n)\s*(\d+)[\.\/]\s+/g;
    while ((m = numHeaderRegex.exec(questionBody)) !== null) {
      matches.push({
        prefix: 'Câu',
        isBai: false,
        qNum: parseInt(m[1]),
        scoreStr: null,
        index: m.index,
        headerLength: m[0].length
      });
    }
  }

  // 5. Trích xuất chi tiết từng câu hỏi / bài tập
  const questions = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const qRaw = questionBody.substring(cur.index, next ? next.index : questionBody.length).trim();
    const isAfterEssayDivider = cur.index >= essayStartIndex;

    // Tìm các lựa chọn A, B, C, D (hỗ trợ *A., A*., [x] A.)
    const optionMatches = [];
    const optRegex = /(?:^|\n|\s)\s*([*]?[A-E][*]?)\s*[:.\)]\s*([^\n]+)/g;
    let optM;
    while ((optM = optRegex.exec(qRaw)) !== null) {
      const fullLabel = optM[1].trim();
      const isMarkedCorrect = fullLabel.includes('*');
      const letterChar = fullLabel.replace(/[*]/g, '').toUpperCase();
      const letterCode = letterChar.charCodeAt(0) - 65;
      const optText = optM[2].trim();
      if (letterCode >= 0 && letterCode <= 4) {
        optionMatches.push({
          letter: letterChar,
          code: letterCode,
          text: `${letterChar}. ${optText}`,
          isMarked: isMarkedCorrect
        });
      }
    }

    const fromAnswerMap = answerKeyMap.get(cur.qNum);
    const isExplicitEssay = fromAnswerMap?.isEssay || isAfterEssayDivider || (cur.isBai && optionMatches.length < 2) || (optionMatches.length < 2);

    let parsedScore = null;
    if (cur.scoreStr) {
      const sMatch = cur.scoreStr.match(/(\d+(?:[.,]\d+)?)/);
      if (sMatch) parsedScore = parseFloat(sMatch[1].replace(',', '.'));
    }

    let type = isExplicitEssay ? 'ESSAY' : 'MULTIPLE_CHOICE';
    let options = [];
    let correctAnswers = [];
    let selectionMode = 'SINGLE';

    if (type === 'MULTIPLE_CHOICE') {
      options = optionMatches.length >= 2 
        ? optionMatches.map(o => o.text) 
        : ['A', 'B', 'C', 'D'];

      if (fromAnswerMap && fromAnswerMap.answers.length > 0) {
        correctAnswers = fromAnswerMap.answers;
      } else {
        const markedList = optionMatches.filter(o => o.isMarked).map(o => o.code);
        if (markedList.length > 0) {
          correctAnswers = markedList;
        } else {
          const inlineAnsMatch = qRaw.match(/(?:Đáp\s*án|Đ\/A|Key|Answer)\s*[:=]\s*([A-E,]+)/i);
          if (inlineAnsMatch) {
            const letters = inlineAnsMatch[1].replace(/,/g, '').toUpperCase();
            for (const ch of letters) {
              const code = ch.charCodeAt(0) - 65;
              if (code >= 0 && code <= 4 && !correctAnswers.includes(code)) {
                correctAnswers.push(code);
              }
            }
          }
        }
      }

      if (correctAnswers.length > 1) {
        selectionMode = 'MULTIPLE';
      }
    }

    // Làm sạch nội dung câu hỏi
    let content = qRaw;
    if (optionMatches.length > 0) {
      const firstOptIndex = qRaw.search(/(?:^|\n|\s)\s*[*Reference]?[*]?[A-E][*]?\s*[:.\)]/);
      if (firstOptIndex > 0) {
        content = qRaw.substring(0, firstOptIndex).trim();
      }
    }

    const qText = content.replace(/^(?:Câu|Question|Bài)\s*\d*(?:\s*\([^)]+\))?[:.-]?\s*/i, '').trim() || `${cur.prefix || 'Câu'} ${cur.qNum || (i + 1)}`;
    const finalScore = parsedScore !== null ? parsedScore : (type === 'ESSAY' ? 1.5 : 0.25);

    questions.push({
      stt: cur.qNum || (i + 1),
      type,
      content: qText,
      prompt: qText,
      options,
      correctAnswers: correctAnswers.sort((a, b) => a - b),
      selectionMode,
      score: finalScore,
      minWords: type === 'ESSAY' ? 50 : 0
    });
  }

  // 6. Nếu số câu tìm được ít hơn bảng đáp án, bổ sung các câu từ bảng đáp án
  if (questions.length === 0 && answerKeyMap.size > 0) {
    answerKeyMap.forEach((val, qNum) => {
      const itemText = val.isEssay ? `Câu ${qNum} (Tự luận)` : `Câu ${qNum}`;
      questions.push({
        stt: qNum,
        type: val.isEssay ? 'ESSAY' : 'MULTIPLE_CHOICE',
        content: itemText,
        prompt: itemText,
        options: val.isEssay ? [] : ['A', 'B', 'C', 'D'],
        correctAnswers: val.answers,
        selectionMode: val.answers.length > 1 ? 'MULTIPLE' : 'SINGLE',
        score: val.isEssay ? 1.5 : 0.25,
        minWords: val.isEssay ? 50 : 0
      });
    });
    questions.sort((a, b) => a.stt - b.stt);
  }

  result.questions = questions;
  result.detectedQuestionsCount = questions.length;
  result.mcqCount = questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
  result.essayCount = questions.filter(q => q.type === 'ESSAY').length;
  result.hasAnswers = questions.some(q => q.correctAnswers.length > 0);

  // Sinh chuỗi cú pháp nhanh QuickAnswerString
  const tokens = [];
  questions.forEach(q => {
    if (q.type === 'ESSAY') {
      tokens.push(`${q.stt}:TL`);
    } else if (q.correctAnswers.length > 1) {
      const letters = q.correctAnswers.map(idx => String.fromCharCode(65 + idx)).join(',');
      tokens.push(`${q.stt}:${letters}`);
    } else if (q.correctAnswers.length === 1) {
      const letter = String.fromCharCode(65 + q.correctAnswers[0]);
      tokens.push(`${q.stt}${letter}`);
    }
  });
  result.quickAnswerString = tokens.join(' ');

  return result;
}

module.exports = {
  parseExamFile,
  parseExamContent
};
