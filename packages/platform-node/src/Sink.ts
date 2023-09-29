/**
 * @since 1.0.0
 */

import * as internal from "@effect/platform-node/internal/sink"
import type { LazyArg } from "effect/Function"
import type { Sink } from "effect/Sink"
import type { Writable } from "stream"

/**
 * @category model
 * @since 1.0.0
 */
export interface FromWritableOptions {
  readonly endOnClose?: boolean
  readonly encoding?: BufferEncoding
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const fromWritable: <E, A>(
  evaluate: LazyArg<Writable>,
  onError: (error: unknown) => E,
  options?: FromWritableOptions
) => Sink<never, E, A, never, void> = internal.fromWritable
