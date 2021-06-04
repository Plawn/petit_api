import Graph, { IndexStoreProvider } from "./graph";

export class APIRouter<T> {
    protected api: BaseAPI<T>;
    protected graph: Graph<T>;
    private prefix: string;
    public constructor(baseAPI: BaseAPI<T>, prefix: string) {
        this.api = baseAPI;
        this.graph = baseAPI.graph;
        this.prefix = prefix;
    }

    protected async get<T>(url: string) {
        const res = await this.api.get<T>(this.prefix + url);
        return res;
    }
    protected async post<T>(url: string, body: any) {
        const res = await this.api.post<T>(this.prefix + url, body);
        return res;
    }
    protected async delete<T>(url: string, body: any) {
        const res = await this.api.delete<T>(this.prefix + url, body);
        return res;
    }
    protected async put<T>(url: string, body: any) {
        const res = await this.api.put<T>(this.prefix + url, body);
        return res;
    }
    protected async patch<T>(url: string, body: any) {
        const res = await this.api.patch<T>(this.prefix + url, body);
        return res;
    }
}

type FetchProvider = (url: string, authProvider: AuthProvider) => ({
    api: <T>(path: string, method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: any, empty?: boolean, json?: boolean) => Promise<T>;
    get: <T>(path: string, json?: boolean) => Promise<T>;
    post: <T>(path: string, body: any) => Promise<T>;
    patch: <T>(path: string, body?: any) => Promise<T>;
    put: <T>(path: string, body?: any) => Promise<T>;
    delete: <T>(path: string, empty?: boolean) => Promise<T>;
})

class BaseAPI<T> {
    protected prefix: string;
    public graph: Graph<T>;

    api: <T>(path: string, method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: any, empty?: boolean, json?: boolean) => Promise<T>;
    get: <T>(path: string, json?: boolean) => Promise<T>;
    post: <T>(path: string, body: any) => Promise<T>;
    patch: <T>(path: string, body?: any) => Promise<T>;
    put: <T>(path: string, body?: any) => Promise<T>;
    delete: <T>(path: string, empty?: boolean) => Promise<T>;

    constructor(url: string, graph: Graph<T>, authProvider: AuthProvider, builder: FetchProvider) {
        this.graph = graph;
        this.prefix = url;
        const funcs = builder(url, authProvider);
        this.api = funcs.api;
        this.get = funcs.get;
        this.post = funcs.post;
        this.patch = funcs.patch;
        this.put = funcs.put;
        this.delete = funcs.delete;
    }
}

export interface AuthProvider {
    isTokenExpired: () => boolean;
    token: string;
}

type APIRouterProvider<T> = new (baseAPI: BaseAPI<T>, prefix: string) => APIRouter<T>;

export class APIStore<T> {
    private routes: { [k: string]: { url: string, router: APIRouterProvider<T> } };
    constructor(routes?: { [k: string]: { url: string, router: APIRouterProvider<T> } }) {
        this.routes = routes || {};
    }
    public at(name: string, url: string, router: APIRouterProvider<T>) {
        this.routes[name] = { url, router };
        return this;
    }

    public data() {
        return this.routes;
    }
}

type APIConstuctoreArgs<T> = {
    url: string;
    authProvider: AuthProvider;
    fetchProvider: FetchProvider;
    store: APIStore<T>;
    indexProvider: IndexStoreProvider<T>;
}

export class API<Schema, T> {
    private url: string;
    private _graph: Graph<Schema>;
    private handlers: T;
    private baseAPI: BaseAPI<Schema>;

    constructor(args: APIConstuctoreArgs<Schema>) {
        const { url, store, fetchProvider: builder, authProvider, indexProvider } = args;
        this.url = url;
        this.baseAPI = new BaseAPI(url, this._graph, authProvider, builder);
        this.registerHandlers(store);
        this._graph = new Graph<Schema>(indexProvider);
    }

    private registerHandlers(handlers: APIStore<Schema>) {
        const routes = handlers.data();

        Object.keys(routes).forEach(k => {
            const d = routes[k];
            this.registerHandler(k, d.router, d.url);
        })
    }

    private registerHandler(name: string, handler: new (baseAPI: BaseAPI<Schema>, prefix: string) => APIRouter<Schema>, url: string) {
        this.handlers[name] = new handler(this.baseAPI, url);
    }

    /**
     * 
     * @param settings For later use if we want to specify how to apply cache
     * @returns 
     */
    public use(settings?: any) {
        return this.handlers;
    }

    public graph() {
        return this._graph;
    }

}

