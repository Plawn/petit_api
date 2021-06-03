
const POINTER_TOKEN = '@';
const REPO_TOKEN = '<!n>';


const isPointer = (s: any[] | string) => typeof s === 'string' && s[0] === POINTER_TOKEN;

export type IncomingData<T> = {
    schema: any;
    objects: any;
    repos: T;
}

export default class Graph<R> {
    graph: any;
    repos: R;
    repoMap: any;
    infos: any;
    schema: any;
    constructor() {
        this.graph = {};
        //@ts-ignore
        this.repos = {};
        this.infos = {};
        this.schema = {};
        this.repoMap = {};
    }

    /**
     * @param {object} data
     * @returns {Graph}
     */
    addParsedJSON = (data: IncomingData<R>) => {
        // don't need to apply checks, it comes from an automated serializer
        this.schema = data.schema;
        // merging data
        this.graph = { ...this.graph, ...data.objects };

        // creating repos if they don't already exists
        Object.keys(data.repos).forEach(name => {
            if (!Object.keys(this.repos).includes(name)) {
                //@ts-ignore
                this.repos[name] = [];
            }
        });

        // binding all objects
        Object.keys(data.objects).forEach(e => this.bindObject(data.objects[e], e));

        // binding repos with real names
        // this way we can avoid rebinding everything
        //@ts-ignore
        Object.keys(this.schema).forEach(k => this.repos[this.schema[k]] = this.repos[k]);
        return this;
    }

    /**
     * @param {string} data
     * @returns {Graph}
     */
    addJSON = (data: string) => this.addParsedJSON(JSON.parse(data));

    // @ts-private
    /**
     * @param {Object} obj
     * @param {string} key
     * @returns {void}
     */
    private addToRepo = (obj: any, key: string): void => {
        // we prevent data duplication, while keeping arrays for faster access
        if (Object.keys(this.infos).includes(key)) {
            //@ts-ignore
            this.repos[obj[REPO_TOKEN]][this.infos[key]] = obj;
        } else {
            // console.log(this.repos);
            //@ts-ignore
            this.infos[key] = this.repos[obj[REPO_TOKEN]].length;
            //@ts-ignore
            this.repos[obj[REPO_TOKEN]].push(obj);
        }
    }

    // @ts-private
    /**
     * @param {Object} obj
     * @param {string} key
     * @returns {void}
     */
    private bindObject = (obj: any, key: string): void => {
        Object.keys(obj).forEach(k => {
            const val = obj[k];

            if (isPointer(k)) {
                const newKey = k.slice(1);

                if (typeof val === 'string') {
                    obj[newKey] = this.graph[val];
                    delete obj[k];
                    return;
                }

                // if is Array then bind array
                // if dict then bind dict
                // if single value then bind one value
                // binding arrays
                if (Array.isArray(val) && val.length) {
                    obj[newKey] = val.map(i => this.graph[i]);
                    delete obj[k];
                    return;
                }

                // we already checked all the other types
                // so now we have to do the next steps for a map
                Object.keys(val).forEach(k => {
                    val[k] = this.graph[val[k]];
                    // delete
                });
                obj[newKey] = val;
                delete obj[k];

            }
        });
        this.addToRepo(obj, key);
    };
}
