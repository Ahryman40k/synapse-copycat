cmd_Release/obj.target/gba/myobject.o := g++ -o Release/obj.target/gba/myobject.o ../myobject.cc '-DNODE_GYP_MODULE_NAME=gba' '-DUSING_UV_SHARED=1' '-DUSING_V8_SHARED=1' '-DV8_DEPRECATION_WARNINGS=1' '-D_GLIBCXX_USE_CXX11_ABI=1' '-D_LARGEFILE_SOURCE' '-D_FILE_OFFSET_BITS=64' '-D__STDC_FORMAT_MACROS' '-DOPENSSL_NO_PINSHARED' '-DOPENSSL_THREADS' '-DBUILDING_NODE_EXTENSION' -I/home/ahryman/.cache/node-gyp/21.4.0/include/node -I/home/ahryman/.cache/node-gyp/21.4.0/src -I/home/ahryman/.cache/node-gyp/21.4.0/deps/openssl/config -I/home/ahryman/.cache/node-gyp/21.4.0/deps/openssl/openssl/include -I/home/ahryman/.cache/node-gyp/21.4.0/deps/uv/include -I/home/ahryman/.cache/node-gyp/21.4.0/deps/zlib -I/home/ahryman/.cache/node-gyp/21.4.0/deps/v8/include  -fPIC -pthread -Wall -Wextra -Wno-unused-parameter -m64 -O3 -fno-omit-frame-pointer -fno-rtti -fno-exceptions -std=gnu++17 -MMD -MF ./Release/.deps/Release/obj.target/gba/myobject.o.d.raw   -c
Release/obj.target/gba/myobject.o: ../myobject.cc ../myobject.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/node.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/cppgc/common.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8config.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-array-buffer.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-local-handle.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-handle-base.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-internal.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8config.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-object.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-maybe.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-persistent-handle.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-weak-callback-info.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-primitive.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-data.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-value.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-traced-handle.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-container.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-context.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-snapshot.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-date.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-debug.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-script.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-callbacks.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-promise.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-message.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-exception.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-extension.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-external.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-function.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-function-callback.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-template.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-memory-span.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-initialization.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-isolate.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-embedder-heap.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-microtask.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-statistics.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-unwinder.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-embedder-state-scope.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-platform.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-source-location.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-json.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-locker.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-microtask-queue.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-primitive-object.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-proxy.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-regexp.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-typed-array.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-value-serializer.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-version.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-wasm.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/node_version.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/node_api.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/js_native_api.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/js_native_api_types.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/node_api_types.h \
 /home/ahryman/.cache/node-gyp/21.4.0/include/node/node_object_wrap.h
../myobject.cc:
../myobject.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/node.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/cppgc/common.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8config.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-array-buffer.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-local-handle.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-handle-base.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-internal.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8config.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-object.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-maybe.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-persistent-handle.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-weak-callback-info.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-primitive.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-data.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-value.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-traced-handle.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-container.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-context.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-snapshot.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-date.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-debug.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-script.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-callbacks.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-promise.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-message.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-exception.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-extension.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-external.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-function.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-function-callback.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-template.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-memory-span.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-initialization.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-isolate.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-embedder-heap.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-microtask.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-statistics.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-unwinder.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-embedder-state-scope.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-platform.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-source-location.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-json.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-locker.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-microtask-queue.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-primitive-object.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-proxy.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-regexp.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-typed-array.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-value-serializer.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-version.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/v8-wasm.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/node_version.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/node_api.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/js_native_api.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/js_native_api_types.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/node_api_types.h:
/home/ahryman/.cache/node-gyp/21.4.0/include/node/node_object_wrap.h: