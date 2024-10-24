local dap = require("dap")

dap.adapters.lldb = {
  type = "executable",
  command = "/usr/bin/lldb", -- adjust as needed
  name = "lldb",
}

dap.configurations.rust = {
  {
    name = "tauri-dev",
    type = "lldb",
    request = "launch",
    program = function()
      return vim.fn.getcwd() .. "apps/synapse-copycat/src-tauri/target/debug/synapse-copycat"
    end,
    cwd = "${workspaceFolder}",
    stopOnEntry = false,
  },
  {
    name = "Attach tauri-dev",
    type = "lldb",
    request = "attach",
    program = function()
      return vim.fn.getcwd() .. "apps/synapse-copycat/src-tauri/target/debug/synapse-copycat"
    end,
    cwd = "${workspaceFolder}",
    stopOnEntry = false,
  },
}
