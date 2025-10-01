# 1.1.1

## Added

- Append: New preferred options object for the third argument to `client.append`.
  - `outputTypes`: string[] — which outputs to request
  - `additionalParams` (optional): object — request-level parameters applied to every input record in the call
  - Example:
    ```js
    for await (const results of client.append("contact", inputs, {
      outputTypes: ["email", "phone"],
      additionalParams: { cfg_max_emails: 3 },
    })) {
      // ...
    }
    ```

## Changed

- Append: The legacy third-argument array form (e.g., `client.append("contact", inputs, ["email", "phone"])`) is still supported for backward compatibility but is now deprecated. Please migrate to the options object shown above.

## Notes

- You can still include parameters on individual input records when you need per-record behavior (not deprecated). If a parameter is provided both per-record and in `additionalParams`, the value from the input record applies for that call.
