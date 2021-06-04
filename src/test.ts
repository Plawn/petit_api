import { API, APIRouter, APIStore, AuthProvider } from "./api";
import { defaultBrowserFetchProvider } from "./baseAPI";
import { FlattenedGraphData } from "./graph";

type Audit = {
    id: number;
}

type AuditSession = {
    id: number;
}

// could be automaticcaly built from typescript engine
// extract from all APIRouter
type KiwiSchema = {
    audits: Audit[];
}

type KiwiGraphData = FlattenedGraphData<KiwiSchema>;

class AuditHandlers extends APIRouter<KiwiSchema> {
    getById = async (id: number) =>
        this.graph
            .loadData(await this.get<KiwiGraphData>(`/${id}`))
            .objects
            .audits[id];

    createAudit(date: string) {
        return this.post<Audit>('/', { date });
    }
    createSession(beginAt: string, endAt: string) {
        return this.post<AuditSession>('/', { beginAt, endAt });
    }
    getSession() {

    }
}

// could be automaticcaly built from typescript engine
// extract from all APIRouter
type KiwiHandlers = {
    audit: AuditHandlers
}

const dummyAuthProvider: AuthProvider = {
    token: "testToken",
    isTokenExpired: () => false,
}

const store = new APIStore<KiwiSchema>()
    .at('audit', '/audit', AuditHandlers)
    ;

const indexProvider = {
    audits: (obj: Audit) => obj.id
}

const api = new API<KiwiSchema, KiwiHandlers>({
    url: 'http://localhost:3000/api',
    authProvider: dummyAuthProvider,
    fetchProvider: defaultBrowserFetchProvider,
    store,
    indexProvider: indexProvider,
});

const auditId = 10;

const res = api
    .use()
    .audit
    .getById(auditId);
// wrap result to cache result in graph
// and return the interesting one

const audit = api.graph().repos.audits.find(i => i.id === 1);

const newSession = api.use().audit.createSession('now', 'later');
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