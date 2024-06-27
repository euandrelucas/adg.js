import Fastify from 'fastify'
import path from 'node:path'
import { glob } from 'glob'
import Page from './page.js';

export default class WebServer {
    server: Fastify.FastifyInstance;
    routesDir?: string;
    publicDir?: string;
    host?: string;
    debug?: boolean;
    port: number;

    constructor({
        routesDir,
        publicDir,
        host,
        debug,
        port
    }: {
        routesDir?: string,
        publicDir?: string,
        host?: string,
        debug?: boolean,
        port: number
    }) {
        this.server = Fastify();
        this.routesDir = routesDir ? routesDir : 'routes';
        this.publicDir = publicDir ? publicDir : 'public';
        this.debug = debug ? debug : false;
        this.host = host ? host : '0.0.0.0';
        this.port = port;
    }

    async addRoute(type: 'GET' | 'POST', path: string, handler: Fastify.RouteHandler) {
        this.server.route({
            method: type,
            url: path,
            handler: handler
        });
    }

    async readRoutes() {
        if (this.routesDir) {
            const files = await glob(`${this.routesDir}/**/*.js`, { cwd: path.resolve() });
            for (const file of files) {
                const routesPath = path.resolve(file);
                try {
                    const route = await import(`file:///${routesPath.replace(/\\/g, '/')}`);
                    if (route.default instanceof Page) {
                        const processPath = routesPath.split('/');
                        processPath.shift();
                        const routePath = processPath.join('/').replace('.js', '');
                        if (this.debug) {
                            console.log(`Adding route ${routePath}`);
                        }
                        console.log(route)
                        this.addRoute('GET', '/' + routePath, async (request, reply) => {
                            reply.type('text/html').send(route.default.buildStaticPage());
                        });
                    } else {
                        throw new Error('Route must be an instance of Page');
                    }
                } catch (error) {
                    throw new Error(`Error importing route ${routesPath}: ${error}`);
                }
            }
        }
    }

    async start() {
        await this.readRoutes();
        await this.server.listen({ port: this.port, host: this.host });
        if (this.debug) {
            console.log(`Server running at http://${this.host}:${this.port}`);
        }
    }
}