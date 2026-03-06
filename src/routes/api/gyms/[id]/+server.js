import { json } from '@sveltejs/kit';

const NOT_AVAILABLE = {
  error: 'Modifica/eliminazione non disponibile nel deploy pubblico. Gestisci i dati dal file CSV.'
};

export async function PUT() {
  return json(NOT_AVAILABLE, { status: 501 });
}

export async function DELETE() {
  return json(NOT_AVAILABLE, { status: 501 });
}