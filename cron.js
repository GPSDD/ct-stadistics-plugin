require('app-module-path').addPath(__dirname);
const CronJob = require('cron').CronJob;
const mongoose = require('mongoose');
const debug = require('debug')('stadistics-plugin');
const StadisticService = require('./lib/stadistic.service');

module.exports = function cron(plugin, generalConfig) {
    debug('Loading statistics cron');
    const connection = mongoose.createConnection(`${generalConfig.mongoUri}`);
    const stadisticService = new StadisticService(connection);
    async function tick() {
        try {
            debug('Executing tick in statistics microservice');
            await stadisticService.completeGeoInfo();
        } catch (error) {
            debug('Error: ', error);
        }
    }

    new CronJob('00 * * * * *', tick, null, true, 'America/Los_Angeles'); // eslint-disable-line no-new
};
