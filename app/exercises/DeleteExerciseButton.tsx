"use client";

import DeleteButton from "../DeleteButton";

export default function DeleteExerciseButton({ id }: { id: string }) {
  return <DeleteButton table="exercises" id={id} label="exercise" />;
}
