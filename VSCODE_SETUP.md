# VSCode Setup Guide for MosaicLedger

This guide will help you set up and run the MosaicLedger website in Visual Studio Code.

## Prerequisites

Before you begin, make sure you have the following installed on your system:

1. **Node.js** (v20 or later) - [Download here](https://nodejs.org/)
2. **pnpm** - After installing Node.js, enable it with: `corepack enable`
3. **Visual Studio Code** - [Download here](https://code.visualstudio.com/)

> **Note:** The minimum required Node.js version is 20. You can check your version with `node --version`.

## Step 1: Clone and Open the Repository

1. Clone the repository:

   ```bash
   git clone https://github.com/rilical/MosaicLedger.git
   cd MosaicLedger
   ```

2. Open the folder in VSCode:
   ```bash
   code .
   ```
   Or use **File → Open Folder** in VSCode and select the `MosaicLedger` folder.

## Step 2: Install Recommended Extensions

When you open the project, VSCode will automatically prompt you to install recommended extensions. Click **Install All** to install:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - CSS class suggestions
- **TypeScript** - Enhanced TypeScript support
- And more...

You can also manually install them by:

1. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open Extensions
2. Search for the extension ID from `.vscode/extensions.json`
3. Click **Install**

## Step 3: Install Project Dependencies

Open the integrated terminal in VSCode:

- Press `` Ctrl+` `` (backtick) or use **Terminal → New Terminal**

Then run:

```bash
corepack enable
pnpm install
```

This will:
1. Install all required dependencies for the project
2. Automatically build all packages (via a postinstall script)

> **Note:** If `corepack enable` doesn't make pnpm available, try `corepack prepare pnpm@10.0.0 --activate` to explicitly activate the version specified in package.json.

## Step 4: Start the Development Server

You have several options to start the dev server:

### Option 1: Using Terminal

In the VSCode terminal, run:

```bash
pnpm dev
```

### Option 2: Using Tasks

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select **Dev: Start development server**

### Option 3: Using Debug Configuration

1. Go to the Debug view (`Ctrl+Shift+D` or `Cmd+Shift+D`)
2. Select **Next.js: debug full stack** from the dropdown
3. Press the green play button (or F5)

## Step 5: View the Website

Once the server is running, you'll see output like:

```
▲ Next.js 15.1.6
- Local:        http://localhost:3000
- Network:      http://10.x.x.x:3000

✓ Ready in 1297ms
```

### Option 1: Use External Browser

Simply open your browser and navigate to `http://localhost:3000`

### Option 2: Use VSCode Simple Browser

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type "Simple Browser: Show"
3. Enter `http://localhost:3000`

### Option 3: Install Browser Preview Extension

1. Install the "Browser Preview" extension by auchenberg
2. Press `Ctrl+Shift+P` and type "Browser Preview: Open Preview"
3. Navigate to `http://localhost:3000`

## Step 6: Try the Demo

Once the site loads:

1. You'll see the landing page at `http://localhost:3000`
2. Click **"Enter the app"** or navigate to `http://localhost:3000/app`
3. Click **"Use Demo Data"** to load sample transactions
4. Explore:
   - **Mosaic** - Visual spending breakdown
   - **Recurring** - Detected subscription charges
   - **Plan** - Recommended actions with savings

## Common Tasks in VSCode

### Run Commands

Press `Ctrl+Shift+P` and type "Tasks: Run Task", then choose:

- **Dev: Start development server** - Start the dev server
- **Build: Build all packages** - Build for production
- **Lint: Run ESLint** - Check code for errors
- **Format: Format code with Prettier** - Auto-format all code
- **Test: Check demo data** - Verify demo functionality

### Debugging

1. Set breakpoints by clicking in the gutter (left of line numbers)
2. Press F5 or use the Debug panel
3. Choose a debug configuration:
   - **Next.js: debug server-side** - Debug server components
   - **Next.js: debug client-side** - Debug browser code
   - **Next.js: debug full stack** - Debug both (recommended)

### Format on Save

The workspace is configured to auto-format files when you save (`Ctrl+S`). This uses Prettier and ESLint.

### IntelliSense & Auto-completion

- TypeScript types are automatically detected
- Import suggestions work out of the box
- Hover over functions/variables to see documentation

## Troubleshooting

### Port 3000 is already in use

If you see "Port 3000 is already in use", you have several options:

1. **Stop the other process** using port 3000:
   - On Linux/Mac: `lsof -ti:3000 | xargs kill`
   - On Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
2. **Use a different port**:
   ```bash
   PORT=3001 pnpm dev
   ```
   Then access the app at `http://localhost:3001`

### pnpm command not found

If `pnpm` is not available after running `corepack enable`:

1. First, ensure you're using Node.js v20 or later: `node --version`
2. Try explicitly activating pnpm:
   ```bash
   corepack prepare pnpm@10.0.0 --activate
   ```
3. Restart your terminal or VSCode
4. Verify pnpm is now available: `pnpm --version` (should show `10.0.0`)

### Module not found errors

If you encounter module/import errors:

1. Run `pnpm install` again to ensure all dependencies are installed
2. The postinstall script should automatically build packages - verify by checking for `dist/` folders in `packages/*/`
3. If needed, manually rebuild: `pnpm build`

### TypeScript errors

1. Make sure you're using the workspace TypeScript version
2. Press `Ctrl+Shift+P`, type "TypeScript: Select TypeScript Version"
3. Choose "Use Workspace Version"

### Browser not opening automatically

The debug configurations include `serverReadyAction` to auto-open Chrome. If it doesn't work:

1. Manually open `http://localhost:3000` in any browser
2. Or use VSCode's Simple Browser (see Step 5, Option 2)

## Environment Variables (Optional)

**The demo works perfectly without any environment variables!** The app defaults to demo mode with sample data.

For advanced features (live bank connections, authentication, etc.), you can create a `.env.local` file in `apps/web/`:

```bash
# Copy the example file
cp apps/web/.env.example apps/web/.env.local
```

Then edit `.env.local` with your API keys if needed. See the [.env.example](./apps/web/.env.example) file for all available options.

**Key settings:**
- `NEXT_PUBLIC_DEMO_MODE=1` - Demo mode (default, no API keys needed)
- `NEXT_PUBLIC_PLAID_ENABLED=0` - Plaid bank connections (requires API keys)
- `NEXT_PUBLIC_SUPABASE_URL` - Authentication/database (optional)

## Additional Resources

- **Project README**: [README.md](./README.md)
- **Contributing Guide**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Status & Changes**: [docs/STATUS.md](./docs/STATUS.md)
- **Next.js Documentation**: https://nextjs.org/docs
- **pnpm Documentation**: https://pnpm.io/

## Quick Reference

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `corepack enable`   | Enable pnpm package manager       |
| `pnpm install`      | Install dependencies + build pkgs |
| `pnpm dev`          | Start development server          |
| `pnpm build`        | Build packages for production     |
| `pnpm lint`         | Run ESLint                        |
| `pnpm typecheck`    | Run TypeScript type checking      |
| `pnpm test`         | Run all tests                     |
| `pnpm format`       | Format code with Prettier         |
| `pnpm check-demo`   | Verify demo functionality         |
| `Ctrl+Shift+P`      | Command Palette (VSCode)          |
| `Ctrl+``            | Toggle Terminal (VSCode)          |
| `Ctrl+Shift+D`      | Debug Panel (VSCode)              |
| `F5`                | Start Debugging (VSCode)          |

---

**Need help?** Check the [issues](https://github.com/rilical/MosaicLedger/issues) or create a new one!
