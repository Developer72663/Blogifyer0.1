// middlewares/queryParams.js
const queryHandler = (req, res, next) => {
    const { search = '', sort = 'newest', page = 1, limit = 9 } = req.query;

    req.queryParams = {
        search: search.trim(),
        sort,
        page: parseInt(page),
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
    };
    next();
};

module.exports = { queryHandler };
