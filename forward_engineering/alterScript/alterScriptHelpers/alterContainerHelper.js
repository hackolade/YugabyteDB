const { AlterScriptDto } = require('../types/AlterScriptDto');

const { getModifySchemaCommentsScriptDtos } = require('./containerHelpers/commentsHelper');

/**
 * @return {(name: string) => AlterScriptDto}
 * */
const getAddContainerScriptDto = app => containerName => {
	const _ = app.require('lodash');
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);
	const { wrapInQuotes } = require('../../utils/general')(_);
	const script = ddlProvider.createSchemaOnly(wrapInQuotes(containerName));
	return AlterScriptDto.getInstance([script], true, false);
};

/**
 * @return {(name: string) => AlterScriptDto}
 * */
const getDeleteContainerScriptDto = app => containerName => {
	const _ = app.require('lodash');
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);
	const { wrapInQuotes } = require('../../utils/general')(_);

	const script = ddlProvider.dropSchema(wrapInQuotes(containerName));
	return AlterScriptDto.getInstance([script], true, false);
};

/**
 * @return {(container: Object) => Array<AlterScriptDto>}
 * */
const getModifyContainerScriptDtos = app => container => {
	const _ = app.require('lodash');
	const ddlProvider = require('../../ddlProvider/ddlProvider')(null, null, app);

	const modifyCommentScripts = getModifySchemaCommentsScriptDtos(_, ddlProvider)(container);

	return [...modifyCommentScripts];
};

module.exports = {
	getAddContainerScriptDto,
	getDeleteContainerScriptDto,
	getModifyContainerScriptDtos,
};
