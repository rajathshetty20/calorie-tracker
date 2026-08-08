"use client";

import DeleteButton from "../DeleteButton";

export default function DeleteMealButton({ id }: { id: string }) {
  return <DeleteButton table="meals" id={id} label="meal" />;
}
