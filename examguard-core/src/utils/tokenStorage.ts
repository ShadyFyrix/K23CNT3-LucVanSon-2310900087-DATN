const ACCESS_TOKEN = "examguard_access_token";
const REFRESH_TOKEN = "examguard_refresh_token";
const USER = "examguard_user";

export const tokenStorage = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN) || localStorage.getItem("crm_access_token");
  },

  setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN, token);
  },

  setRefreshToken(token: string) {
    localStorage.setItem(REFRESH_TOKEN, token);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN) || localStorage.getItem("crm_refresh_token");
  },

  getUser() {
    const user = localStorage.getItem(USER) || localStorage.getItem("crm_user");

    if (!user || user === "undefined") {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  },

  setUser(user: any) {
    localStorage.setItem(USER, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem(USER);
    // Xóa cả key cũ nếu còn lưu lại trong trình duyệt
    localStorage.removeItem("crm_access_token");
    localStorage.removeItem("crm_refresh_token");
    localStorage.removeItem("crm_user");
  },

  removeAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem("crm_access_token");
  },

  removeRefreshToken() {
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem("crm_refresh_token");
  }
};