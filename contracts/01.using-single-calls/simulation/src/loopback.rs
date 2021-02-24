#![allow(dead_code, unused_variables)]
use near_sdk::{near_bindgen, json_types::U128};
use near_sdk::serde::{Serialize, Deserialize};
#[allow(dead_code)]
#[near_bindgen]
pub struct Loopback {
}

#[near_bindgen]
impl Loopback {
  pub fn call_myself() {}
  pub fn call_myself_with_args() {}
  pub fn call_myself_and_return() {}
  pub fn myself_with_args(args: CustomType) {}
  pub fn myself_with_args2(arg1: &str, arg2: bool, arg3: U128) { }
}

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct CustomType {
    pub arg1: String,
    pub arg2: bool,
    pub arg3: U128,
}

// @nearBindgen
// class CustomTypeWrapper {
//   constructor(public args: CustomType) { }
// }
