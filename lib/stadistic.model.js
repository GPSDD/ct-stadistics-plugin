const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bluebird = require('bluebird');

mongoose.Promise = bluebird;

let stadistic = null;
function stadisticModel(connection) {
    if (stadistic) {
        return stadistic;
    }

    const Stadistic = new Schema({
        sourcePath: { type: String, required: true, trim: true },
        sourceMethod: { type: String, required: true, trim: true },
        redirectUrl: { type: String, required: false, trim: true },
        redirectMethod: { type: String, required: false, trim: true },
        endpointPath: { type: String, required: false, trim: true },
        time: { type: Number, required: true },
        date: { type: Date, required: true, default: Date.now },
        cached: { type: Boolean, required: true, default: false },
        error: { type: Boolean, required: true, default: false },
        code: { type: Number, required: false },
        ip: { type: String, required: false, trim: true },
        anonymous: { type: Boolean, required: true, default: true },
        loggedUser: { type: Schema.Types.Mixed },
        geo: {
            _id: false,
            city: { type: String, required: false, trim: true },
            country: { type: String, required: false, trim: true },
            region: { type: String, required: false, trim: true },
            ll: [{ type: Number, required: false, trim: true }],
            completed: { type: Boolean, required: true, default: false },
        },
        requestType: { type: String, required: false, trim: true },
        datasetId: { type: String, required: false, trim: true },
        datasetName: { type: String, required: false, trim: true },
        datasetProvider: { type: String, required: false, trim: true },
        sandbox: { type: String, required: false, trim: true },
        body: { type: Schema.Types.Mixed },
        queryParams: { type: Schema.Types.Mixed },
        client: { type: String, required: false, default: 'other' },
    });
    stadistic = connection.model('Stadistic', Stadistic);
    return stadistic;
}

module.exports = stadisticModel;
