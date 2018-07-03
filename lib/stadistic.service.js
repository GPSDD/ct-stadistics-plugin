const debug = require('debug')('stadistics-plugin');
const stadisticFunction = require('./stadistic.model');
const geoip = require('geoip-lite');
const rp = require('request-promise');

function getService(connection, plugin) {

    const StadisticModel = stadisticFunction(connection);

    class StadisticService {

        static async completeGeoInfo() {
            debug('Loading stadistics to complete geo info');
            const stadistics = await StadisticModel.find({
                ip: {
                    $exists: true,
                },
                'geo.completed': false,
            }).limit(10000).exec();
            debug('Ips found ', stadistics.length);
            for (let i = 0, length = stadistics.length; i < length; i++) {
                if (stadistics[i].ip && stadistics[i].ip.indexOf('127.0.0.1') === -1) {
                    let ip = stadistics[i].ip;
                    if (ip.indexOf(',') >= 0) {
                        ip = ip.split(',')[1];
                    }
                    const geo = geoip.lookup(ip);
                    if (geo) {
                        stadistics[i].geo = {
                            city: geo.city,
                            country: geo.country,
                            region: geo.region,
                            ll: geo.ll,
                            completed: true,
                        };
                    } else {
                        stadistics[i].geo = {
                            completed: true,
                        };
                    }
                } else {
                    stadistics[i].geo = {
                        completed: true,
                    };
                }
                await stadistics[i].save();
            }
            debug('Finish complete geo');
        }

        static async obtainDataDataset(ctx, model) {
            try {
                let dataset = null;
                let id = null;
                let requestType = 'other';
                if (/dataset/g.test(ctx.path)) {
                    debug('Dataset endpoint');
                    requestType = 'dataset';
                    const groups = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g.exec(ctx.path);
                    if (groups && groups.length > 1) {
                        id = groups[1];
                        
                        if (id) {
                            dataset = await rp({
                                url: `${plugin.config.url}/v1/dataset/${id}?internal=true`,
                                method: 'GET',
                                json: true,
                            });
                            debug(dataset);
                            dataset = dataset.data;
                        }
                    }
                } else if (/query/g.test(ctx.path) && ctx.query.sql) {
                    debug('query');
                    requestType = 'query';
                    const convert = await rp({
                        url: `${plugin.config.url}/v1/convert/sql2SQL?sql=${ctx.query.sql}&internal=true`,
                        method: 'GET',
                        json: true,
                    });
                    id = convert.data.attributes.jsonSql.from;
                    if (id) {
                        dataset = await rp({
                            url: `${plugin.config.url}/v1/dataset/${id}?internal=true`,
                            method: 'GET',
                            json: true,
                        });
                        dataset = dataset.data;
                    }
                }
                model.requestType = requestType;
                model.queryParams = ctx.query;
                debug('dataset');
                debug(dataset);
                if (dataset) {
                    debug('Setting dataset info');
                    model.datasetId = id;
                    model.datasetName = dataset.attributes.name;
                    model.datasetProvider = dataset.attributes.provider;
                    model.sandbox = dataset.attributes.sandbox;
                }
                return model;
            } catch (err) {
                debug(err);
                return model;
            }
        }

        static async middleware(ctx, next) {
            const first = Date.now();
            let error = false;
            let code = null;
            try {
                await next();
            } catch (e) {
                error = true;
                code = e.status || 500;
                throw e;
            } finally {
                if ((!ctx.state || !ctx.state.microservice ) && !ctx.query.internal && !ctx.path.startsWith('/api') && (!ctx.state || !ctx.state.user || ctx.state.user.id !== 'microservice')) {
                    if (ctx.state.source && ctx.state.source.path) {
                        let model = {
                            sourcePath: ctx.state.source.path,
                            sourceMethod: ctx.state.source.method,
                            error,
                            code: code || ctx.response.statusCode,
                            cached: false,
                            time: Date.now() - first,
                            body: ctx.request.body,
                            ip: ctx.headers['x-forwarded-for'],
                            anonymous: (!ctx.state.user && !ctx.req.user && !ctx.state.microservice),
                            loggedUser: ctx.state.user || ctx.req.user || ctx.state.microservice,
                        };
                        if (ctx.state.redirect) {
                            model.endpointPath = ctx.state.redirect.endpoint.path;
                            model.redirectUrl = ctx.state.redirect.url;
                            model.redirectMethod = ctx.state.redirect.method;
                        }
                        model = await StadisticService.obtainDataDataset(ctx, model);
                        debug('Saving stadistic');
                        debug(JSON.stringify(ctx.state.redirect));
                        await new StadisticModel(model).save();
                    } else {
                        const model = {
                            sourcePath: ctx.path,
                            sourceMethod: ctx.request.method,
                            error,
                            code: code || ctx.response.statusCode,
                            body: ctx.request.body,
                            cached: ctx.state.isCached || false,
                            time: Date.now() - first,
                            ip: ctx.headers['x-forwarded-for'],
                            anonymous: (!ctx.state.user && !ctx.req.user && !ctx.state.microservice),
                            loggedUser: ctx.state.user || ctx.req.user || ctx.state.microservice
                        };
                        if (ctx.state.redirect) {
                            model.endpointPath = ctx.state.redirect.endpoint.path;
                            model.redirectUrl = ctx.state.redirect.url;
                            model.redirectMethod = ctx.state.redirect.method;
                        }


                        debug('Saving stadistic');
                        await new StadisticModel(model).save();

                    }
                }
            }
        }

    }
    return StadisticService;
}
module.exports = getService;
