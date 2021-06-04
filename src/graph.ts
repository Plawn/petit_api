
const POINTER_TOKEN = '@';
const REPO_TOKEN = '<!n>';

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

const isPointer = (s: any[] | string) => typeof s === 'string' && s[0] === POINTER_TOKEN;

export type FlattenedGraphData<T> = {
    schema: { [repoName: string]: string };
    objects: { [objUid: string]: any };
    repos: T;
}

type SchemaType = {
    [repoName: string]: any;
};

/**
 * This function takes a given object and returns it's id in order to map it inside a map
 */
export type IndexFunction<T> = (obj: T) => number;

/**
 * Basic index provider, returns the `id` field of the given object
 * @param obj 
 * @returns 
 */
export const idIndexProvider: IndexFunction<any> = (obj: any) => obj.id as number;

export type IndexStoreProvider<T extends SchemaType> = {
    [k in keyof T]: IndexFunction<ArrayElement<T[k]>>
}

export default class Graph<Schema extends SchemaType> {
    graph: {[k: string]: any};
    repos: Schema;
    objects: { [k in keyof Schema]: { [k2: number]: ArrayElement<Schema[k]> } };
    infos: { [k: string]: number };
    schema: any;
    indexFunction: IndexStoreProvider<Schema>;

    constructor(indexStoreProvider: IndexStoreProvider<Schema>) {
        this.indexFunction = indexStoreProvider;
        this.graph = {};
        //@ts-ignore
        this.repos = {};
        this.infos = {};
        this.schema = {};
        //@ts-ignore
        this.objects = {};
    }

    /**
     * @param {object} data
     * @returns {Graph}
     */
    loadData = (data: FlattenedGraphData<Schema>) => {
        // don't need to apply checks, it comes from an automated serializer
        this.schema = data.schema;
        // merging data
        // TODO: assert!
        // is it what we really want ?
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
     * @param {Object} obj
     * @param {string} key
     * @returns {void}
     */
    private addToRepo = (obj: any, key: string): void => {
        const objectRepo = obj[REPO_TOKEN];
        // we prevent data duplication, while keeping arrays for faster access
        if (Object.keys(this.infos).includes(key)) {
            //@ts-ignore
            this.repos[objectRepo][this.infos[key]] = obj;
        } else {
            // console.log(this.repos);
            //@ts-ignore
            this.infos[key] = this.repos[obj[REPO_TOKEN]].length;
            //@ts-ignore
            this.objects[objectRepo][this.indexFunction[objectRepo](obj)] = obj;
            this.repos[objectRepo].push(obj);
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
