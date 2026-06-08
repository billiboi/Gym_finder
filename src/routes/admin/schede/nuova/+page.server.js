import { actions as schedeActions } from '../+page.server.js';
import { canWriteSupabase, gymStoreStatus } from '$lib/server/gym-store';
import { DISCIPLINE_ALIAS_ROWS, DISCIPLINE_MASTER } from '$lib/discipline-taxonomy';

export function load() {
  return {
    persistentWrites: canWriteSupabase(),
    disciplineOptions: DISCIPLINE_MASTER.map((discipline) => discipline.name),
    aliasSuggestions: DISCIPLINE_ALIAS_ROWS,
    storeStatus: gymStoreStatus()
  };
}

export const actions = {
  create: schedeActions.create
};
