module.exports = {
    TODO_SCHEMA: {
        USERNAME: 'username'
    },
    TASK_SCHEMA: {
        TODO: 'todoId',
        CREATOR: 'creator',
        STATUS: 'status',
        DUE_DATE: 'due',
        TITLE: 'title',
        DESCRIPTION: 'description',
        ASSIGNED: 'assigned'
    },

    STATUS_ENUM: {
        NEW: 'NEW',
        DOING: 'DOING',
        REVIEW: 'REVIEW',
        DONE: 'DONE'
    },

    USER_SCHEMA: {
        NAME: 'name',
        USERNAME: 'username'
    }
}