use ext_php_rs::prelude::*;

#[php_function]
pub fn hello_world() -> String {
    "Hello World from Rust!".to_string()
}

// PHP に関数を登録するのがポイント
#[php_module]
pub fn module(module: ModuleBuilder) -> ModuleBuilder {
    module.function(wrap_function!(hello_world))
}
