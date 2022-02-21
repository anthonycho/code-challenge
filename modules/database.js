
const {TASK_SCHEMA, TODO_SCHEMA, STATUS_ENUM} = require('../library/databaseEnum');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'northone';
let db;
const collectionNames = ['todo', 'task', 'history', 'user'];

async function initializeDatabase() {
    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to db');
    db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const existingCollection = new Set(collections.map(collectionInfo => collectionInfo.name));
    const toAdd = collectionNames.filter(name => !existingCollection.has(name));

    console.log('Create collections...');
    await Promise.all(toAdd.map(name => db.createCollection(name)));
    console.log('Done Creation...');

    // update validators because we don't always go through the creation phase
    console.log('Add validators...');
    await db.command({
        collMod: 'todo',
        validationLevel: 'strict',
        validationAction: 'error',
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['_id', TODO_SCHEMA.USERNAME],
                properties: {
                    _id:  {
                        bsonType: 'string',
                        description: 'must be a string and is required'
                    },
                    [TODO_SCHEMA.USERNAME]: {
                        bsonType: 'string',
                        description: 'must be a string and is required'
                    }
                }
            }
        }
    });

    await db.command({
        collMod: 'task',
        validationLevel: 'strict',
        validationAction: 'error',
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['_id', TASK_SCHEMA.CREATOR, TASK_SCHEMA.TODO, TASK_SCHEMA.TITLE,TASK_SCHEMA.DESCRIPTION, TASK_SCHEMA.STATUS, TASK_SCHEMA.DUE_DATE],
                properties: {
                    _id:  {
                        bsonType: 'string',
                        description: 'must be a string and is required'
                    },
                    [TASK_SCHEMA.CREATOR]: {
                        bsonType: 'string',
                        description: 'must be a string and is required'
                    },
                    [TASK_SCHEMA.TODO]: {
                        bsonType: 'string',
                        description: 'must be a string and is required'
                    },
                    [TASK_SCHEMA.TITLE]: {
                        bsonType: 'string',
                        description: 'must be a string and is required'
                    },
                    [TASK_SCHEMA.DESCRIPTION]: {
                        bsonType: 'string',
                        description: 'must be a string and is required'
                    },
                    [TASK_SCHEMA.DUE_DATE]: {
                        bsonType: 'date',
                        description: 'must be a date and is required'
                    },
                    [TASK_SCHEMA.STATUS]: {
                        enum: Object.values(STATUS_ENUM),
                        description: `must be a one of ${Object.values(STATUS_ENUM)} and is required`
                    }
                }
            }
        }
    });

    console.log('Finished adding validators...');
    console.log('Create indexes...');
    // allow us to search for all tasks under a todo
    await db.collection('task').createIndex(
        {
            [TASK_SCHEMA.TODO]: 1
        }
    );

    // allow us to search for all tasks assigned to user by status and due date
    await db.collection('task').createIndex(
        {
            [TASK_SCHEMA.ASSIGNED]: 1
        },
        {
            [TASK_SCHEMA.STATUS]: 1
        },
        {
            [TASK_SCHEMA.DUE_DATE]: 1
        }
    );

    // allow us to search for all tasks created by user
    await db.collection('task').createIndex(
        {
            [TASK_SCHEMA.CREATOR]: 1
        }
    );

    console.log('Finished Creating indexes...');
    console.log('Database client ready!');
}

const remove = async (collection, filter) => {
    return db.collection(collection).deleteMany(filter);
}

const queryTasks = async (query) => {
    return db.collection('task').find(query).toArray();
}

const updateTask = async (update) => {
    update._id = update._id || (new ObjectId()).toString();
    const filter = { _id: update._id }
    const options = { upsert: true };
    return db.collection('task').updateOne(
        filter,
        {
            $set: update
         },
        options
    );
}

const deleteTask = async (filter) => {
    return remove('task', filter);
}

const queryTodo = async (query) => {
    return db.collection('todo').find(query).toArray();
}

const updateTodo = async (update) => {
    update._id = update._id || (new ObjectId()).toString();
    const filter = { _id: update._id }
    const options = { upsert: true };
    return db.collection('todo').updateOne(
        filter,
        {
            $set: update
            },
        options
    );
}

const deleteTodo = async (filter) => {
    return remove('todo', filter);
}

const getExpiringTasks = async (username, startTime, endTime) => {
    startTime = startTime || new Date();
    const timeConstraints = endTime ? 
        {
            $gte: startTime,
            $lte: endTime
        } : 
        {
            $gte: startTime
        }
        
    return db.collection('task').find(
        {
            [TASK_SCHEMA.ASSIGNED]: username,
            [TASK_SCHEMA.STATUS]: { $eq: STATUS_ENUM.NEW },
            [TASK_SCHEMA.DUE_DATE]: timeConstraints
            
        }
    ).toArray();
}

function errorHandler(error) {
    console.log(error);
    throw error;
}

function errorWrapper(fn, errorHandler) {
    return async (...args) => {
        try {
            return fn(...args);
        } catch (error) {
            return errorHandler(error);
        }
    };
}

initializeDatabase();

module.exports = {
    getClient: () => { return client },
    queryTasks: errorWrapper(queryTasks, errorHandler),
    updateTask: errorWrapper(updateTask, errorHandler),
    deleteTask: errorWrapper(deleteTask, errorHandler),
    remove: errorWrapper(remove, errorHandler),
    getExpiringTasks: errorWrapper(getExpiringTasks, errorHandler),
    queryTodo: errorWrapper(queryTodo, errorHandler),
    updateTodo: errorWrapper(updateTodo, errorHandler),
    deleteTodo: errorWrapper(deleteTodo, errorHandler),
    
}