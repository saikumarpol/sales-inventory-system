
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "stockwise_access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Cannot connect to the backend. Check that FastAPI is running."
    );
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" && data !== null
        ? data.detail
        : data;

    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg || JSON.stringify(item)).join(", ")
      : typeof detail === "string"
        ? detail
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export const authApi = {
  login(credentials) {
    return apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  register(user) {
    return apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(user),
    });
  },

  me() {
    return apiRequest("/api/auth/me");
  },
};

export const productsApi = {
  list: () => apiRequest("/api/products/"),
  get: (id) => apiRequest(`/api/products/${id}`),
  create: (product) =>
    apiRequest("/api/products/", {
      method: "POST",
      body: JSON.stringify(product),
    }),
  update: (id, product) =>
    apiRequest(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(product),
    }),
  remove: (id) =>
    apiRequest(`/api/products/${id}`, {
      method: "DELETE",
    }),
};

export const customersApi = {
  list: () => apiRequest("/api/customers/"),
  get: (id) => apiRequest(`/api/customers/${id}`),
  create: (customer) =>
    apiRequest("/api/customers/", {
      method: "POST",
      body: JSON.stringify(customer),
    }),
  update: (id, customer) =>
    apiRequest(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(customer),
    }),
  remove: (id) =>
    apiRequest(`/api/customers/${id}`, {
      method: "DELETE",
    }),
};

export const ordersApi = {
  list: () => apiRequest("/api/orders/"),
  get: (id) => apiRequest(`/api/orders/${id}`),
  create: (order) =>
    apiRequest("/api/orders/", {
      method: "POST",
      body: JSON.stringify(order),
    }),
  approve: (id) =>
    apiRequest(`/api/orders/${id}/approve`, {
      method: "POST",
    }),
  reject: (id) =>
    apiRequest(`/api/orders/${id}/reject`, {
      method: "POST",
    }),
};
