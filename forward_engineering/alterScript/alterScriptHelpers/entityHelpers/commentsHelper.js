const { AlterCollectionDto } = require('../../types/AlterCollectionDto');
const { AlterScriptDto } = require('../../types/AlterScriptDto');

/**
 * @return {(collection: AlterCollectionDto) => AlterScriptDto | undefined}
 */
const getUpdatedCommentOnCollectionScriptDto = (_, ddlProvider) => collection => {
	const { getFullTableName, wrapComment } = require('../../../utils/general')(_);

	const descriptionInfo = collection?.role.compMod?.description;
	if (!descriptionInfo) {
		return undefined;
	}

	const { old: oldComment, new: newComment } = descriptionInfo;
	if (!newComment || newComment === oldComment) {
		return undefined;
	}

	const tableName = getFullTableName(collection);
	const comment = wrapComment(newComment);

	const script = ddlProvider.updateTableComment(tableName, comment);
	return AlterScriptDto.getInstance([script], true, false);
};

/**
 * @return {(collection: AlterCollectionDto) => AlterScriptDto | undefined}
 */
const getDeletedCommentOnCollectionScriptDto = (_, ddlProvider) => collection => {
	const { getFullTableName } = require('../../../utils/general')(_);

	const descriptionInfo = collection?.role.compMod?.description;
	if (!descriptionInfo) {
		return '';
	}

	const { old: oldComment, new: newComment } = descriptionInfo;
	if (!oldComment || newComment) {
		return '';
	}

	const tableName = getFullTableName(collection);

	const script = ddlProvider.dropTableComment(tableName);
	return AlterScriptDto.getInstance([script], true, true);
};

/**
 * @return {(collection: AlterCollectionDto) => Array<AlterScriptDto>}
 * */
const getModifyEntityCommentsScriptDtos = (_, ddlProvider) => collection => {
	const updatedCommentScriptDto = getUpdatedCommentOnCollectionScriptDto(_, ddlProvider)(collection);
	const deletedCommentScriptDto = getDeletedCommentOnCollectionScriptDto(_, ddlProvider)(collection);

	return [updatedCommentScriptDto, deletedCommentScriptDto].filter(Boolean);
};

module.exports = {
	getModifyEntityCommentsScriptDtos,
};
