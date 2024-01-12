// hello.cc
#include "./myobject.h"
#include <node.h>

namespace demo {

using v8::Context;
using v8::Exception;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::FunctionTemplate;
using v8::Isolate;
using v8::Local;
using v8::Null;
using v8::Number;
using v8::Object;
using v8::String;
using v8::Value;

// This is the implementation of the "add" method
// Input arguments are passed using the
// const FunctionCallbackInfo<Value>& args struct
void Add(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();

  // Check the number of arguments passed.
  if (args.Length() < 2) {
    // Throw an Error that is passed back to JavaScript
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong number of arguments")
            .ToLocalChecked()));
    return;
  }

  // Check the argument types
  if (!args[0]->IsNumber() || !args[1]->IsNumber()) {
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "Wrong arguments").ToLocalChecked()));
    return;
  }

  // Perform the operation
  double value = args[0].As<Number>()->Value() + args[1].As<Number>()->Value();
  Local<Number> num = Number::New(isolate, value);

  // Set the return value (using the passed in
  // FunctionCallbackInfo<Value>&)
  args.GetReturnValue().Set(num);
}

void Method(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  args.GetReturnValue().Set(
      String::NewFromUtf8(isolate, "gba world").ToLocalChecked());
}

void RunCallback(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();
  Local<Function> cb = Local<Function>::Cast(args[0]);
  const unsigned argc = 1;
  Local<Value> argv[argc] = {
      String::NewFromUtf8(isolate, "hello world from callback")
          .ToLocalChecked()};
  cb->Call(context, Null(isolate), argc, argv).ToLocalChecked();
}

void CreateObject(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();

  Local<Object> obj = Object::New(isolate);
  obj->Set(context, String::NewFromUtf8(isolate, "msg").ToLocalChecked(),
           args[0]->ToString(context).ToLocalChecked())
      .FromJust();

  args.GetReturnValue().Set(obj);
}

void MyFunction(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  args.GetReturnValue().Set(
      String::NewFromUtf8(isolate, "hello world from built function")
          .ToLocalChecked());
}

void CreateFunction(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();

  Local<Context> context = isolate->GetCurrentContext();
  Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, MyFunction);
  Local<Function> fn = tpl->GetFunction(context).ToLocalChecked();

  // omit this to make it anonymous
  fn->SetName(String::NewFromUtf8(isolate, "theFunction").ToLocalChecked());

  args.GetReturnValue().Set(fn);
}

void Initialize(Local<Object> exports /*, Local<Object> module*/) {
  NODE_SET_METHOD(exports, "hello", Method);
  NODE_SET_METHOD(exports, "add", Add);
  NODE_SET_METHOD(exports, "callbackTry", RunCallback);
  NODE_SET_METHOD(exports, "factory", CreateObject);
  NODE_SET_METHOD(exports, "factoryFn", CreateFunction);
  MyObject::Init(exports);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)

} // namespace demo
