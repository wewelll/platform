import * as Error from "@effect/platform/Error"
import * as Terminal from "@effect/platform/Terminal"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as readline from "node:readline"

const defaultShouldQuit = (input: Terminal.UserInput): boolean =>
  input.key.ctrl && (input.key.name === "c" || input.key.name === "d")

/** @internal */
export const make = (
  shouldQuit: (input: Terminal.UserInput) => boolean = defaultShouldQuit
) =>
  Effect.gen(function*(_) {
    const input = yield* _(Effect.sync(() => globalThis.process.stdin))
    const output = yield* _(Effect.sync(() => globalThis.process.stdout))

    // Acquire a `readline` interface and use it to force `stdin` to emit
    // keypress events
    const acquireReadlineInterface = Effect.sync(() => {
      const rl = readline.createInterface({ input, escapeCodeTimeout: 50 })
      readline.emitKeypressEvents(input, rl)
      if (input.isTTY) {
        input.setRawMode(true)
      }
      return rl
    })

    // Handle the `"keypress"` event emitted by `stdin` forced by `readline`
    const handleKeypressEvent = Effect.async<never, Terminal.QuitException, Terminal.UserInput>((resume) => {
      const handleKeypress = (input: string | undefined, key: readline.Key) => {
        const userInput: Terminal.UserInput = {
          input: Option.fromNullable(input),
          key: {
            name: key.name || "",
            ctrl: key.ctrl || false,
            meta: key.meta || false,
            shift: key.shift || false
          }
        }
        if (shouldQuit(userInput)) {
          resume(Effect.fail(new Terminal.QuitException()))
        } else {
          resume(Effect.succeed(userInput))
        }
      }
      input.once("keypress", handleKeypress)
      return Effect.sync(() => {
        input.removeListener("keypress", handleKeypress)
      })
    })

    // Close the `readline` interface
    const releaseReadlineInterface = (rl: readline.Interface) =>
      Effect.sync(() => {
        if (input.isTTY) {
          input.setRawMode(false)
        }
        rl.close()
      })

    const readInput = Effect.acquireUseRelease(
      acquireReadlineInterface,
      () => handleKeypressEvent,
      releaseReadlineInterface
    )

    const display = (prompt: string): Effect.Effect<never, Error.PlatformError, void> =>
      Effect.uninterruptible(
        Effect.async((resume) => {
          output.write(prompt, (err) => {
            if (err) {
              resume(Effect.fail(Error.BadArgument({
                module: "Terminal",
                method: "display",
                message: (err as Error).message ?? String(err)
              })))
            }
            resume(Effect.unit)
          })
        })
      )

    return Terminal.Terminal.of({
      // The columns property can be undefined if stdout was redirected
      columns: output.columns || 0,
      readInput,
      display
    })
  })

/** @internal */
export const layer: Layer.Layer<never, never, Terminal.Terminal> = Layer.scoped(
  Terminal.Terminal,
  make(defaultShouldQuit)
)
