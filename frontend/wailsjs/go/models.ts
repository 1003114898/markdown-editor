export namespace main {
	
	export class FileResult {
	    path: string;
	    name: string;
	    content: string;
	    suggestedName: string;
	    canceled: boolean;
	    imported: boolean;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new FileResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.content = source["content"];
	        this.suggestedName = source["suggestedName"];
	        this.canceled = source["canceled"];
	        this.imported = source["imported"];
	        this.error = source["error"];
	    }
	}
	export class SessionTab {
	    id: string;
	    name: string;
	    path: string;
	    suggestedName: string;
	    content: string;
	    dirty: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SessionTab(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.path = source["path"];
	        this.suggestedName = source["suggestedName"];
	        this.content = source["content"];
	        this.dirty = source["dirty"];
	    }
	}
	export class Session {
	    tabs: SessionTab[];
	    activeIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new Session(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tabs = this.convertValues(source["tabs"], SessionTab);
	        this.activeIndex = source["activeIndex"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

