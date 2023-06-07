const extractDescription = (view) => {
    return view?.role?.compMod?.description || {};
}

/**
 * @return (view: Object) => string
 * */
const getUpsertCommentsScript = (_, ddlProvider) => (view) => {
    const {getFullViewName} = require("../../../utils/general")(_);
    const {wrapComment} = require('../../general')({_});

    const description = extractDescription(view);
    if (description.new && description.new !== description.old) {
        const wrappedComment = wrapComment(description.new);
        const viewName = getFullViewName(view);
        return ddlProvider.updateViewComment(viewName, wrappedComment);
    }
    return '';
}

/**
 * @return (view: Object) => string
 * */
const getDropCommentsScript = (_, ddlProvider) => (view) => {
    const description = extractDescription(view);
    const {getFullViewName} = require("../../../utils/general")(_);

    if (description.old && !description.new) {
        const viewName = getFullViewName(view);
        return ddlProvider.dropViewComment(viewName);
    }
    return '';
}

/**
 * @return (view: Object) => Array<string>
 * */
const getModifyViewCommentsScripts = (_, ddlProvider) => (view) => {
    const upsertCommentScript = getUpsertCommentsScript(_, ddlProvider)(view);
    const dropCommentScript = getDropCommentsScript(_, ddlProvider)(view);
    return [
        upsertCommentScript,
        dropCommentScript
    ].filter(Boolean);
}

module.exports = {
    getModifyViewCommentsScripts
}
