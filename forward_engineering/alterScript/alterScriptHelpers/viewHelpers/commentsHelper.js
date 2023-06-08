const {AlterScriptDto} = require('../../types/AlterScriptDto');

/**
 * @param view {Object}
 * @return {{
 *     new?: string,
 *     old?: string,
 * }}
 * */
const extractDescription = (view) => {
    return view?.role?.compMod?.description || {};
}

/**
 * @return {(view: Object) => AlterScriptDto | undefined}
 * */
const getUpsertCommentsScriptDto = (_, ddlProvider) => (view) => {
    const {getFullViewName, wrapComment} = require("../../../utils/general")(_);

    const description = extractDescription(view);
    if (description.new && description.new !== description.old) {
        const wrappedComment = wrapComment(description.new);
        const viewName = getFullViewName(view);
        const script = ddlProvider.updateViewComment(viewName, wrappedComment);
        return AlterScriptDto.getInstance([script], true, false);
    }
    return undefined;
}

/**
 * @return {(view: Object) => AlterScriptDto | undefined}
 * */
const getDropCommentsScriptDto = (_, ddlProvider) => (view) => {
    const description = extractDescription(view);
    const {getFullViewName} = require("../../../utils/general")(_);

    if (description.old && !description.new) {
        const viewName = getFullViewName(view);
        const script = ddlProvider.dropViewComment(viewName);
        return AlterScriptDto.getInstance([script], true, true);
    }
    return undefined;
}

/**
 * @return {(view: Object) => AlterScriptDto[]}
 * */
const getModifyViewCommentsScriptDtos = (_, ddlProvider) => (view) => {
    const upsertCommentScriptDto = getUpsertCommentsScriptDto(_, ddlProvider)(view);
    const dropCommentScriptDto = getDropCommentsScriptDto(_, ddlProvider)(view);
    return [
        upsertCommentScriptDto,
        dropCommentScriptDto
    ].filter(Boolean);
}

module.exports = {
    getModifyViewCommentsScriptDtos
}
