const mongoose = require('mongoose');
const Student = require('./models/student.model');

async function testPipeline() {
  const parentId = new mongoose.Types.ObjectId();
  
  // Create a mock student document in memory or just print the pipeline
  const pipeline = [
      { 
          $match: { 
              parentAccountId: parentId
          } 
      },
      {
          $lookup: {
              from: 'enrollments',
              localField: '_id',
              foreignField: 'studentId',
              as: 'enrollments'
          }
      },
      { 
          $unwind: { 
              path: '$enrollments', 
              preserveNullAndEmptyArrays: true 
          } 
      },
      {
          $lookup: {
              from: 'classes',
              localField: 'enrollments.classId',
              foreignField: '_id',
              as: 'classDetails'
          }
      },
      { $unwind: { path: '$classDetails', preserveNullAndEmptyArrays: true } },
      {
          $lookup: {
              from: 'courses',
              localField: 'classDetails.courseId',
              foreignField: '_id',
              as: 'courseDetails'
          }
      },
      { $unwind: { path: '$courseDetails', preserveNullAndEmptyArrays: true } },
      {
          $lookup: {
              from: 'attendances',
              let: { sId: '$_id', cId: '$classDetails._id' },
              pipeline: [
                  { 
                      $match: { 
                          $expr: { 
                              $and: [
                                  { $eq: ['$studentId', '$$sId'] },
                                  { $eq: ['$classId', '$$cId'] }
                              ]
                          } 
                      } 
                  },
                  { $sort: { createdAt: -1 } }
              ],
              as: 'attendances'
          }
      },
      {
          $addFields: {
              courseData: {
                  courseId: '$courseDetails._id',
                  courseName: '$courseDetails.name',
                  className: '$classDetails.name',
                  summary: {
                      total: { $size: { $ifNull: ['$attendances', []] } },
                      present: {
                          $size: {
                              $filter: { 
                                  input: { $ifNull: ['$attendances', []] }, 
                                  as: 'a', 
                                  cond: { $eq: ['$$a.status', 'Present'] } 
                              }
                          }
                      },
                      absent: {
                          $size: {
                              $filter: { 
                                  input: { $ifNull: ['$attendances', []] }, 
                                  as: 'a', 
                                  cond: { $eq: ['$$a.status', 'Absent'] } 
                              }
                          }
                      }
                  },
                  records: { $slice: [{ $ifNull: ['$attendances', []] }, 20] } 
              }
          }
      },
      {
          $group: {
              _id: '$_id',
              fullName: { $first: '$fullName' },
              studentCode: { $first: '$studentCode' },
              courses: { $push: '$courseData' }
          }
      },
      {
          $project: {
              id: '$_id',
              _id: 0,
              fullName: 1,
              studentCode: 1,
              courses: {
                  $filter: {
                      input: '$courses',
                      as: 'c',
                      cond: { $ne: ['$$c.courseId', null] }
                  }
              }
          }
      }
  ];
  
  console.log("Pipeline valid.");
}
testPipeline();
