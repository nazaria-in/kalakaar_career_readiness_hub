// mobile/src/lib/api/people-picker.ts

import { createPeoplePickerApi } from "@repo/shared";
import { supabase } from "@/lib/supabase/client";

export const peoplePickerApi = createPeoplePickerApi(supabase);

export type {
  SelectablePerson,
  FetchSelectablePeopleParams,
} from "@repo/shared";