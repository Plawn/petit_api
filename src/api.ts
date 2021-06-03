import { getFetchers } from "./baseAPI";
import Graph, { IncomingData } from "./graph";

class APIRouter {
    private _api: BaseAPI;
    private prefix: string;
    public constructor(baseAPI: BaseAPI, prefix: string) {
        this._api = baseAPI;
        this.prefix = prefix;
    }

    public api() {
        return this._api;
    }

    public static of(baseAPI: BaseAPI, url: string) {
        // add prefix
        return new APIRouter(baseAPI, url);
    }

    public async get<T>(url: string) {
        const res = await this._api.get<T>(this.prefix + url);
        return res;
    }
}

type BuilderType = typeof getFetchers;


class BaseAPI {
    private prefix: string;
    api: <T>(path: string, method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: any, empty?: boolean, json?: boolean) => Promise<T>;
    get: <T>(path: string, json?: boolean) => Promise<T>;
    constructor(url: string, authProvider: AuthProvider, builder: BuilderType) {
        this.prefix = url;
        const funcs = getFetchers(url, authProvider);
        this.api = funcs.api;
        this.get = funcs.get;
    }
}

export interface AuthProvider {
    isTokenExpired: () => boolean;
    token: string;
}

type KiwiSchema = {
    audits: Audit[];
}

class API<Schema, T> {
    private url: string;
    private _graph: Graph<Schema>;
    private handlers: T;
    private baseAPI: BaseAPI;

    constructor(url: string, authProvider: AuthProvider, builder: BuilderType, handlers: any) {
        this.url = url;
        this.baseAPI = new BaseAPI(url, authProvider, builder);
        this.registerHandlers(handlers);
        this._graph = new Graph<Schema>();
    }

    private registerHandlers(handlers: any) {
        // TODO: dummy for now
        Object.keys(handlers).forEach(k => {
            this.registerHandler(k, handlers[k])
        })
    }

    private registerHandler(name: string, handler: typeof APIRouter) {
        this.handlers[name] = handler.of(this.baseAPI, this.url);
    }

    public use() {
        return this.handlers;
    }

    public graph() {
        return this._graph;
    }

}

type Audit = {
    id: number;
}

class AuditHandlers extends APIRouter {
    getById(id: number) {
        return this.api().get<Audit>(`${id}`);
    }
}

type KiwiHandlers = {
    audit: AuditHandlers
}

const handlers = {
    audit: AuditHandlers
}

const dummyAuthProvider: AuthProvider = {
    token: "testToken",
    isTokenExpired: () => false,
}


const api = new API<KiwiSchema, KiwiHandlers>('http://localhost:3000/api', dummyAuthProvider, getFetchers, handlers);

const auditId = 10;

const res = api
    .use()
    .audit
    .getById(auditId);
    // wrap result to cache result in graph
    // and return the interesting one

const audit = api.graph().repos.audits.find(i => i.id === 1);

/*
usage:

// create audit

api
    .use('audit')
    .post(data)


// get audit by id

    api
        .use('audit')
        .get(id)


*/