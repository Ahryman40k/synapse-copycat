cmd_Release/gba.node := ln -f "Release/obj.target/gba.node" "Release/gba.node" 2>/dev/null || (rm -rf "Release/gba.node" && cp -af "Release/obj.target/gba.node" "Release/gba.node")
