import { fail, redirect } from '@sveltejs/kit';
import { readDisciplines, writeDisciplines } from '$lib/server/discipline-store';

function clean(value) {
  return String(value ?? '').trim();
}

export async function load({ url }) {
  const list = await readDisciplines();
  return {
    disciplines: list,
    created: url.searchParams.get('created') === '1',
    deleted: url.searchParams.get('deleted') === '1'
  };
}

export const actions = {
  create: async ({ request }) => {
    const form = await request.formData();
    const name = clean(form.get('name'));

    if (!name) {
      return fail(400, { createError: 'Inserisci una disciplina valida.' });
    }

    const list = await readDisciplines();
    if (list.map((d) => d.toLowerCase()).includes(name.toLowerCase())) {
      return fail(400, { createError: 'Disciplina gi&agrave; presente.' });
    }

    const next = [...list, name];
    await writeDisciplines(next);

    throw redirect(303, '/admin/disciplines?created=1');
  },
  delete: async ({ request }) => {
    const form = await request.formData();
    const name = clean(form.get('name'));

    if (!name) {
      return fail(400, { error: 'Disciplina non valida.' });
    }

    const list = await readDisciplines();
    const next = list.filter((item) => item.toLowerCase() !== name.toLowerCase());

    if (next.length === list.length) {
      return fail(404, { error: 'Disciplina non trovata.' });
    }

    await writeDisciplines(next);

    throw redirect(303, '/admin/disciplines?deleted=1');
  }
};
