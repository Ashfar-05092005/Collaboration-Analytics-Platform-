
const API_BASE = String(process.env.REACT_APP_API_URL || DEPLOYED_API_URL).trim().replace(/\/+$/, "");

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("Session expired");
  }

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false || !data.data?.accessToken) {
    throw new Error(data.message || "Session expired");
  }

  localStorage.setItem("accessToken", data.data.accessToken);
  return data.data.accessToken;
};

const request = async (path, options = {}, retry = true) => {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const rawBody = await res.text();
  let data = {};
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    data = {};
  }
  const hasRefresh = Boolean(localStorage.getItem("refreshToken"));
  if (res.status === 401 && retry && hasRefresh) {
    try {
      const newToken = await refreshAccessToken();
      return request(
        path,
        {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newToken}`,
          },
        },
        false
      );
    } catch (err) {
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      throw err;
    }
  }
  if (!res.ok || data.success === false) {
    const message = data.message || rawBody || "Request failed";
    throw new Error(message);
  }

  return data.data;
};

const buildQuery = (params = {}) => {
  const filtered = Object.entries(params || {}).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
  const query = new URLSearchParams(filtered);
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
};

const unwrapList = (data) => (data && data.items ? data.items : data);


const api = {
  get: (path, options) => request(path, { method: "GET", ...options }),
  post: (path, body, options) =>
    request(path, { method: "POST", body: JSON.stringify(body), ...options }),
  patch: (path, body, options) =>
    request(path, { method: "PATCH", body: JSON.stringify(body), ...options }),
  del: (path, options) => request(path, { method: "DELETE", ...options }),
};

export const authLogin = async (credentials) => {
  const data = await api.post("/api/auth/login", credentials);
  const { accessToken, refreshToken, user } = data;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  saveUser(user);
  return user;
};

export const authRegister = (payload) => api.post("/api/auth/register", payload);

export const authLogout = () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (refreshToken) {
    api.post("/api/auth/logout", { refreshToken }).catch(() => undefined);
  }
  localStorage.removeItem("user");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const saveUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
};

export const getAccessToken = () => localStorage.getItem("accessToken");

export const fetchNotifications = (params) =>
  api.get(`/api/notifications${buildQuery(params)}`).then(unwrapList);

export const markNotificationRead = (notifId) =>
  api.patch(`/api/notifications/${notifId}/read`, {});

export const deleteNotification = (notifId) =>
  api.del(`/api/notifications/${notifId}`);

export const reportIssue = (payload) => api.post("/api/issues", payload);
export const fetchIssues = (params) => api.get(`/api/issues${buildQuery(params)}`).then(unwrapList);
export const getIssue = (issueId) => api.get(`/api/issues/${issueId}`);
export const updateIssueStatus = (issueId, status) =>
  api.patch(`/api/issues/${issueId}/status`, { status });
export const resolveIssue = (issueId, resolution) =>
  api.patch(`/api/issues/${issueId}/resolve`, { resolution });
export const escalateIssue = (issueId, escalationReason) =>
  api.patch(`/api/issues/${issueId}/escalate`, { escalationReason });

export const fetchProjects = (params) => api.get(`/api/projects${buildQuery(params)}`).then(unwrapList);
export const createProject = (payload) => api.post("/api/projects", payload);
export const updateProject = (projectId, payload) => api.patch(`/api/projects/${projectId}`, payload);
export const deleteProject = (projectId) => api.del(`/api/projects/${projectId}`);

export const fetchTeams = (params) => api.get(`/api/teams${buildQuery(params)}`).then(unwrapList);
export const removeTeamMemberFromTeam = (teamId, memberId, reason) =>
  api.del(`/api/teams/${teamId}/members/${memberId}`, { body: JSON.stringify({ reason }) });

export const fetchTasks = (params) => api.get(`/api/tasks${buildQuery(params)}`).then(unwrapList);
export const createTask = (payload) => api.post("/api/tasks", payload);
export const updateTaskStatus = (taskId, status, reviewComment, reviewRating) =>
  api.patch(`/api/tasks/${taskId}/status`, { status, reviewComment, reviewRating });
export const updateTask = (taskId, payload) => api.patch(`/api/tasks/${taskId}`, payload);
export const deleteTask = (taskId) => api.del(`/api/tasks/${taskId}`);

export const fetchUsers = (params) => api.get(`/api/users${buildQuery(params)}`).then(unwrapList);
export const getUser = (id) => api.get(`/api/users/${id}`);
export const updateUser = (id, payload) => api.patch(`/api/users/${id}`, payload);
export const updateStatus = (id, status) => api.patch(`/api/users/${id}/status`, { status });
export const updateRole = (id, role) => api.patch(`/api/users/${id}/role`, { role });
export const updatePoints = (id, payload) => api.patch(`/api/users/${id}/points`, payload);
export const deleteUser = (id) => api.del(`/api/users/${id}`);
export const fetchUserHistory = (id, params) => api.get(`/api/users/${id}/history${buildQuery(params)}`);

export const fetchPointTransactions = (params) =>
  api.get(`/api/points/transactions${buildQuery(params)}`).then(unwrapList);

export const awardPoints = (payload) => api.post("/api/points/award", payload);
export const transferPoints = (payload) => api.post("/api/points/transfer", payload);

export const fetchAnalyticsSummary = () => api.get("/api/analytics/summary");
export const fetchTeamProductivity = () => api.get("/api/analytics/team-productivity");
export const fetchProjectProgress = () => api.get("/api/analytics/project-progress");

export default api;

