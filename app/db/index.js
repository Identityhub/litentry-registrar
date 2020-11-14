'use strict';


const MongoClient = require('mongodb').MongoClient;

const config = require('app/config').mongodb;
const logger = require('app/logger');


class MongodbStorage {
    constructor(config) {
        this.config = config;
        this.client = null;
        this.database = null;
    }

    /**
     * Connect to mongodb
     * TODO: We need to make sure this connection is correct and handle some exceptions if
     *       errors occur.
     */
    async connect() {
        if (this.client) {
            logger.debug(`[MongodbStorage.connect] storage is already connected.`);
            return ;
        }

        let endpoint = '';
        if (this.config.username && this.config.password) {
            // NOTE: not tested
            endpoint = `mongodb://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;
        } else {
            endpoint = `mongodb://${this.config.host}:${this.config.port}`;
        }

        this.client = new MongoClient(endpoint);
        await this.client.connect();
        this.database = this.client.db(this.config.dbName);
        logger.info(`[MongodbStorage.connect] connect to mongodb successfully.`);
    }

    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {*} filter - a filter applied to obtain specific rows
     * @return {*} return a qualified row
     */
    async query(collection, filter) {
        await this.connect();
        const _collection = this.database.collection(collection);
        const results = await _collection.find(filter).toArray();
        return results;
    }

    async queryById(collection, id) {
        return await this.query(collection, { _id: id });
    }

    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {*} content - the content to be inserted into database
     * @return {String} return insertedKey associated with this document
     */
    async insert(collection, content) {
        await this.connect();
        const _collection = this.database.collection(collection);
        const result = await _collection.insertOne(content);
        logger.debug(`[MongodbStorage.insert] insert ${result.insertedCount} document into ${collection}, insertedId is: ${result.insertedId}`);
        return result.insertedId;
    }

    /**
     * @param {String} collection - the collection to be queried inside mongodb database
     * @param {*} filter
     * @param {*} content - the content to be updated
     * @return {String} return insertedKey associated with this document
     */
    async update(collection, filter, content) {
        await this.connect();

        const options = { upsert: true };
        const updateDoc = { $set: content };
        const _collection = this.database.collection(collection);
        const result = await _collection.updateOne(filter, updateDoc, options);
        logger.debug(`[MongodbStorage.update] update ${result.modifiedCount} document into ${collection}`);
    }
    async updateById(collection, id, content) {
        const filter = { _id: id };
        return await this.update(collection, filter, content);
    }
}

class RequestJudgementCollection {
    constructor(db) {
        this.db = db;
        this.collectionName = 'requestJudgement';
    }
    async insert(content) {
        return await this.db.insert(this.collectionName, content);
    }
    async updateById(id, content) {
        return await this.db.updateById(this.collectionName, id, content);
    }
    async updateByAccount(account, content) {
        const filter = { account: account };
        return await this.db.update(this.collectionName, filter, content);
    }

    async query(filter) {
        // TOOD: find one result or all result
        const results = await this.db.query(this.collectionName, filter);
        return results[0];
    }

    async queryByAccount(account) {
        return await this.query(this.collectionName, { account: account });
    }

    async setEmailVerifiedPending(account, email, addition={}) {
        const filter = { account: account, email: email };
        const content = { emailStatus: 'pending', ...addition };
        return await this.db.update(this.collectionName, filter, content);
    }
    async setEmailVerifiedSuccess(account, email) {
        const filter = { account: account, email: email };
        const content = { emailStatus: 'verifiedSuccess' };
        return await this.db.update(this.collectionName, filter, content);
    }
    async setEmailVerifiedFailed(account, email) {
        const filter = { account: account, email: email };
        const content = { emailStatus: 'verifiedFailed' };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setTwitterVerifiedSuccess(account, twitter) {
        const filter = { account: account, twitter: twitter };
        const content = { twitterStatus: 'verifiedSuccess' };
        return await this.db.update(this.collectionName, filter, content);
    }
    async setTwitterVerifiedFailed(account, twitter) {
        const filter = { account: account, twitter: twitter };
        const content = { twitterStatus: 'verifiedFailed' };
        return await this.db.update(this.collectionName, filter, content);
    }

    async setRiotVerifiedSuccess(account, riot) {
        const filter = { account: account, riot: riot };
        const content = { riotStatus: 'verifiedSuccess' };
        return await this.db.update(this.collectionName, filter, content);
    }
    async setRiotVerifiedFailed(account, riot) {
        const filter = { account: account, riot: riot };
        const content = { riotStatus: 'verifiedFailed' };
        return await this.db.update(this.collectionName, filter, content);
    }

}

if (! config) {
    throw new Error('Add configuration for mongodb.');
}

const storage = new MongodbStorage(config);

module.exports = {
    Storage: storage,
    RequestJudgementCollection: new RequestJudgementCollection(storage)
};