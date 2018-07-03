require('app-module-path').addPath(__dirname);
const debug = require('debug')('stadistics-plugin');
const mongoose = require('mongoose');
const stadisticService = require('./lib/stadistic.service');
const stadisticRouter = require('./lib/stadistic.router');

function init() {

}

function middleware(app, plugin, generalConfig) {
    const connection = mongoose.createConnection(`${generalConfig.mongoUri}`);
    debug('Loading stadistics-plugin');
    app.use(stadisticService(connection, plugin).middleware);
    app.use(stadisticRouter(connection).middleware());
}


module.exports = {
    middleware,
    init,
};
