const { BAD_REQUEST, OK } = require("../constants/statusCodes");
const {
    getUrlByShortCode,
    listUrls,
    updateUrl,
    deactivateUrl,
    deleteUrl
} = require("../services/urlManagementService");
const { validatePaginationQuery, validateUrlUpdate } = require("../validators/urlValidator");

const getUrl = async (req, res) => {
    const url = await getUrlByShortCode(req.params.shortCode);
    return res.status(OK).json(url);
};

const listUrlsHandler = async (req, res) => {
    const pagination = validatePaginationQuery(req.query);

    if (pagination.error) {
        return res.status(BAD_REQUEST).json({
            error: pagination.error
        });
    }

    const result = await listUrls(pagination);
    return res.status(OK).json(result);
};

const updateUrlHandler = async (req, res) => {
    const changes = validateUrlUpdate(req.body);

    if (changes.error) {
        return res.status(BAD_REQUEST).json({
            error: changes.error
        });
    }

    const url = await updateUrl(req.params.shortCode, changes);
    return res.status(OK).json(url);
};

const deactivateUrlHandler = async (req, res) => {
    const url = await deactivateUrl(req.params.shortCode);
    return res.status(OK).json(url);
};

const deleteUrlHandler = async (req, res) => {
    await deleteUrl(req.params.shortCode);
    return res.status(OK).json({
        message: "Short URL deleted."
    });
};

module.exports = {
    getUrl,
    listUrls: listUrlsHandler,
    updateUrl: updateUrlHandler,
    deactivateUrl: deactivateUrlHandler,
    deleteUrl: deleteUrlHandler
};
