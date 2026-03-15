Build and validate the STARFORGE TCG project.

1. Run TypeScript type check: `node ./node_modules/typescript/lib/tsc.js --noEmit`
2. Categorize errors as pre-existing (uuid, capacitor, peerjs module errors) vs new errors
3. If there are new errors, fix them
4. Report build status with a summary of any issues
