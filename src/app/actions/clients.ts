"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/rbac";
import {
  clientSchema,
  contactSchema,
  interactionSchema,
} from "@/lib/validators/client";
import * as clients from "@/lib/services/clients";
import { runAction, type ActionResult } from "./helpers";

export async function createClientAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await clients.createClient(ctx, clientSchema.parse(input));
    revalidatePath("/clients");
  });
}

export async function updateClientAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await clients.updateClient(ctx, id, clientSchema.parse(input));
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
  });
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await clients.deleteClient(ctx, id);
    revalidatePath("/clients");
  });
}

export async function addContactAction(
  clientId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await clients.addContact(ctx, clientId, contactSchema.parse(input));
    revalidatePath(`/clients/${clientId}`);
  });
}

export async function updateContactAction(
  clientId: string,
  contactId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await clients.updateContact(ctx, contactId, contactSchema.parse(input));
    revalidatePath(`/clients/${clientId}`);
  });
}

export async function deleteContactAction(
  clientId: string,
  contactId: string
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await clients.deleteContact(ctx, contactId);
    revalidatePath(`/clients/${clientId}`);
  });
}

export async function addInteractionAction(
  clientId: string,
  input: unknown
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await clients.addInteraction(ctx, clientId, interactionSchema.parse(input));
    revalidatePath(`/clients/${clientId}`);
  });
}

export async function deleteInteractionAction(
  clientId: string,
  id: string
): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSession();
    await clients.deleteInteraction(ctx, id);
    revalidatePath(`/clients/${clientId}`);
  });
}
