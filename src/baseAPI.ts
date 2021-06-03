import { AuthProvider } from "./api";

export class HTTPRequestError extends Error {
    code: number;
    constructor(code: number, message: string) {
        super(message);
        this.code = code;
        this.name = "HTTP request error";
    }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const apiUrl = "/api";

export const getFetchers = (apiUrl: string, authProvider: AuthProvider) => {

    async function api<T>(path: string, method: Method = "GET", body?: any, empty = false, json: boolean = true): Promise<T> {
        const headers = new Headers();

        if (authProvider.isTokenExpired()) {
            await refreshToken();
        }

        headers.append("Authorization", `Bearer ${authProvider.token}`);

        if (json) {
            headers.append("Content-Type", "application/json");
            headers.append("Accept", "application/json");
        }

        const res = await fetch(apiUrl + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            try {
                throw new HTTPRequestError(res.status, await res.json());
            } catch {
                throw new HTTPRequestError(res.status, "Unknown error");
            }
        }
        // handling void result
        if (res.headers.get("content-length") === "0" || res.status === 204 || empty) {
            return {} as T;
        }
        if (json) {
            return res.json();
        }
        return (res.blob() as unknown) as T;
    }

    async function get<T>(path: string, json: boolean = true): Promise<T> {
        return api<T>(path, "GET", undefined, false, json);
    }

    async function del<T>(path: string, empty = false): Promise<T> {
        return api<T>(path, "DELETE", undefined, empty); //TODO verify this
    }

    async function post<T>(path: string, body: any): Promise<T> {
        return api<T>(path, "POST", body);
    }

    async function put<T>(path: string, body?: any): Promise<T> {
        return api<T>(path, "PUT", body);
    }

    async function patch<T>(path: string, body?: any): Promise<T> {
        return api<T>(path, "PATCH", body);
    }

    // TODO: fix me
    async function refreshToken() {

    }

    return {
        api, get, put, patch, delete: del, post
    }
}

