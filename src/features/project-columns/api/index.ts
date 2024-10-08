import { SupabaseClient } from '@supabase/supabase-js';
import { RealtimePostgresChangesPayloadType } from '~/features/projects/hooks';
import { CreateColumnDialogFormProps } from '~/features/create-column-dialog/ui/create-column-dialog';
import { ProjectColumn } from '~/routes/dashboard';

type ProjectColumnApiProps = {
	id: string;
	supabase: SupabaseClient;
	userId: string | undefined;
	projectId: string | undefined;
	formData: CreateColumnDialogFormProps;
	projectColumns?: ProjectColumn[];
};

type CreateProjectColumnApiProps = Omit<ProjectColumnApiProps, 'id'>;

type UpdateProjectColumnApiProps = Omit<
	ProjectColumnApiProps,
	'projectId' | 'userId' | 'id'
>;

type DeleteProjectColumnApiProps = Omit<
	ProjectColumnApiProps,
	'projectId' | 'userId'
>;

type ProjectColumnsChannelApiProps = {
	supabase: SupabaseClient;
	handleUpdateProjectsList: (
		payload: RealtimePostgresChangesPayloadType
	) => void;
	projectId: string | undefined;
};

type GetProjectColumnApiProps = {
	supabase: SupabaseClient;
	projectId: string | undefined;
};

const createProjectColumnApi = async ({
	supabase,
	userId,
	projectId,
	formData,
}: CreateProjectColumnApiProps) => {
	try {
		const { name } = formData;
		await supabase.from('project_columns').insert([
			{
				name,
				order: 0,
				owner_id: userId,
				project_id: projectId,
			},
		]);
	} catch (e) {
		console.log('dd.form.error');
	}
};

const updateProjectColumnApi = async ({
	supabase,
	formData,
	projectColumns,
}: UpdateProjectColumnApiProps) => {
	try {
		if (formData) {
			const { name, id } = formData;

			await supabase
				.from('project_columns')
				.update({
					name,
				})
				.eq('id', id);
		}

		if (projectColumns) {
			const reorderProjectColumns = projectColumns.map(
				(projectColumn, index) => ({
					...projectColumn,
					order: index,
				})
			);

			await supabase.from('project_columns').upsert(reorderProjectColumns);
		}
	} catch (e) {
		console.log('dd.form.error');
	}
};

const deleteProjectColumnApi = async ({
	supabase,
	id,
}: DeleteProjectColumnApiProps) => {
	try {
		await supabase.from('project_columns').delete().eq('id', id);
		await supabase.from('project_tasks').delete().eq('project_column_id', id);
	} catch (e) {
		console.log('dd.delete.Project.error', e);
	}
};

const projectColumnsChannelApi = async ({
	supabase,
	handleUpdateProjectsList,
	projectId,
}: ProjectColumnsChannelApiProps) => {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const channel = supabase
		.channel('table-db-changes')
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'project_columns',
				filter: `project_id=eq.${projectId}`,
			},
			payload => handleUpdateProjectsList(payload)
		)
		.subscribe();

	return () => supabase.removeChannel(channel);
};

const getProjectColumnsApi = async ({
	supabase,
	projectId,
}: GetProjectColumnApiProps) => {
	const { data, error } = await supabase
		.from('project_columns')
		.select()
		.order('order', {
			ascending: true,
		})
		.eq('project_id', projectId);

	return {
		data,
		error,
	};
};

export {
	createProjectColumnApi,
	updateProjectColumnApi,
	deleteProjectColumnApi,
	projectColumnsChannelApi,
	getProjectColumnsApi,
};
