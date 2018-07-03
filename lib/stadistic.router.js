const debug = require('debug')('stadistics-plugin');
const Router = require('koa-router');
const stadisticFunction = require('./stadistic.model');
const ApiRouter = new Router({
    prefix: '/api/v1/statistic',
});


function getMiddleware(connection) {
    const StadisticModel = stadisticFunction(connection);
    class StadisticRouter {

        static async get(ctx) {
            debug('Obtaining stadistics');
            const filter = {};
            Object.keys(ctx.query).forEach(key => {
                switch (key) {
                    case 'authenticated':
                        filter.anonymous = ctx.query[key] !== 'true';
                        break;
                    case 'period':
                        const periods = ctx.query.period.split(',');
                        filter.date = {
                            $gte: new Date(periods[0]),
                            $lt: periods.length > 1 ? new Date(periods[1]) : new Date(),
                        }
                        console.log(filter.date);
                        break;
                    case 'userEmail':
                        filter['loggedUser.email'] = {
                            $eq: ctx.query.userEmail,
                        };
                        break;
                    case 'sandbox':
                        filter.sandbox = ctx.query[key] === 'true';
                    case 'code':
                        filter.code = parseInt(ctx.query[key], 10);
                        break;
                    case 'datasetProvider':
                    case 'datasetId':
                    case 'datasetName':
                    case 'requestType':
                        filter[key] = ctx.query[key];
                        break;
                    default:
                        break;
                }
            });
            if (ctx.query.sort) {
                switch (ctx.query.sort) {
                    case 'authenticated':
                        ctx.query.sort = 'anonymous';
                        break;
                    
                    case 'userEmail':
                        ctx.query.sort = 'loggedUser.email';
                        break;
                    case 'sandbox':
                    case 'code':
                    case 'datasetProvider':
                    case 'datasetId':
                    case 'datasetName':
                    default:
                        break;
                }
            }
            if (ctx.query.group) {
                switch (ctx.query.group) {
                    case 'authenticated':
                        ctx.query.group = 'anonymous';
                        break;
                    
                    case 'userEmail':
                        ctx.query.group = 'loggedUser.email';
                        break;
                    case 'userId':
                        ctx.query.group = 'loggedUser.id';
                        break;
                    case 'sandbox':
                    case 'code':
                    case 'datasetProvider':
                    case 'datasetId':
                    case 'datasetName':
                    default:
                        break;
                }
            }

            if (ctx.query.group) {
                console.log([
                    { $match: filter },
                    { $group: { _id: `$${ctx.query.group}`, count: { $sum: 1 } } },
                ]);
                ctx.body = await StadisticModel.aggregate([
                    { $match: filter },
                    { $group: { _id: `$${ctx.query.group}`, count: { $sum: 1 } } },
                ]);
            } else {

                ctx.body = await StadisticModel.find(filter).sort(ctx.query.sort || '-date').exec();
            }

        }

        static async timeByRequest(ctx) {
            debug('Obtaining stadistics aggrouped');
            let filter = null;
            debug('start', ctx.query.from);
            if (ctx.query.from || ctx.query.to) {
                filter = {
                    $match: {
                        date: {},
                    },
                };
                if (ctx.query.from) {
                    filter.$match.date.$gte = new Date(new Date(ctx.query.from).getTime() - (new Date(ctx.query.from).getTimezoneOffset() * 60000));
                }
                if (ctx.query.to) {
                    filter.$match.date.$lte = new Date(new Date(ctx.query.to).getTime() - (new Date(ctx.query.to).getTimezoneOffset() * 60000) + (24 * 60 * 60 * 1000) - 60000);
                }
            }
            const query = [];
            if (filter) {
                query.push(filter);
            }
            query.push({
                $group: {
                    _id: {
                        endpointPath: '$endpointPath',
                        sourceMethod: '$sourceMethod',
                    },
                    sum: {
                        $sum: '$time',
                    },

                },
            });
            ctx.body = await StadisticModel.aggregate(query).exec();
        }

        static async avgByRequest(ctx) {
            debug('Obtaining stadistics aggrouped');
            let filter = null;
            debug('start', ctx.query.from);
            if (ctx.query.from || ctx.query.to) {
                filter = {
                    $match: {
                        date: {},
                    },
                };
                if (ctx.query.from) {
                    filter.$match.date.$gte = new Date(new Date(ctx.query.from).getTime() - (new Date(ctx.query.from).getTimezoneOffset() * 60000));
                }
                if (ctx.query.to) {
                    filter.$match.date.$lte = new Date(new Date(ctx.query.to).getTime() - (new Date(ctx.query.to).getTimezoneOffset() * 60000) + (24 * 60 * 60 * 1000) - 60000);
                }
            }
            const query = [];
            if (filter) {
                query.push(filter);
            }
            query.push({
                $group: {
                    _id: {
                        endpointPath: '$endpointPath',
                        sourceMethod: '$sourceMethod',
                    },
                    sum: {
                        $avg: '$time',
                    },
                    count: {
                        $sum: 1
                    },
                },
            });
            ctx.body = await StadisticModel.aggregate(query).exec();
        }

        static async countRequestToday(ctx) {
            debug('Obtained request of today');
            const date = new Date();
            const today = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
            const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const tomorrow = new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate(), 0, 0, 0);

            const count = await StadisticModel.count({
                date: {
                    $lt: tomorrow,
                    $gte: today,
                },
            }).exec();
            ctx.body = {
                count,
                begin: today.toISOString(),
                end: tomorrow.toISOString(),
            };
        }

        static async countRequestLastWeek(ctx) {
            debug('Obtained request of today');
            const lastWeekDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const lastWeek = new Date(lastWeekDate.getFullYear(), lastWeekDate.getMonth(), lastWeekDate.getDate(), 0, 0, 0);
            const tomorrow = new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate(), 0, 0, 0);


            const count = await StadisticModel.count({
                date: {
                    $lt: tomorrow,
                    $gte: lastWeek,
                },
            }).exec();

            ctx.body = {
                count,
                begin: lastWeek.toISOString(),
                end: tomorrow.toISOString(),
            };
        }

        static async countRequestTodayByCountry(ctx) {
            debug('Obtaining num request today per country');
            const date = new Date();
            const today = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
            const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const tomorrow = new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate(), 0, 0, 0);

            const result = await StadisticModel.aggregate([{
                $match: {
                    date: {
                        $lt: tomorrow,
                        $gte: today,
                    },
                },
            }, {
                $group: {
                    _id: '$geo.country',
                    count: {
                        $sum: 1,
                    },
                },
            }]).exec();
            ctx.body = result;
        }

        static async requestByDay(ctx) {
            debug('Obtaining stadistics aggrouped');
            let filter = null;
            if (ctx.query.from || ctx.query.to) {
                filter = {
                    $match: {
                        date: {},
                    },
                };
                if (ctx.query.from) {
                    filter.$match.date.$gte = new Date(new Date(ctx.query.from).getTime() - (new Date(ctx.query.from).getTimezoneOffset() * 60000));
                }
                if (ctx.query.to) {
                    filter.$match.date.$lte = new Date(new Date(ctx.query.to).getTime() - (new Date(ctx.query.to).getTimezoneOffset() * 60000) + (24 * 60 * 60 * 1000) - 60000);
                }
            }
            const query = [];
            if (filter) {
                query.push(filter);
            }
            query.push({
                $group: {
                    _id: {
                        year: {
                            $year: '$date',
                        },
                        month: {
                            $month: '$date',
                        },
                        day: {
                            $dayOfMonth: '$date',
                        },
                    },
                    count: {
                        $sum: 1,
                    },
                },
            });
            ctx.body = await StadisticModel.aggregate(query).exec();
        }

    }

    ApiRouter.get('/requestByDay', StadisticRouter.requestByDay);
    ApiRouter.get('/countRequestTodayByCountry', StadisticRouter.countRequestTodayByCountry);
    ApiRouter.get('/countRequestToday', StadisticRouter.countRequestToday);
    ApiRouter.get('/countRequestLastWeek', StadisticRouter.countRequestLastWeek);
    ApiRouter.get('/timeByRequest', StadisticRouter.timeByRequest);
    ApiRouter.get('/avgByRequest', StadisticRouter.avgByRequest);
    ApiRouter.get('/', StadisticRouter.get);

    return ApiRouter;
}
module.exports = getMiddleware;
