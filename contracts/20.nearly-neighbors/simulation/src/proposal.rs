use near_sdk::near_bindgen;
#[near_bindgen]
pub struct Proposal {} 

#[near_bindgen]
impl Proposal {
  pub fn initialize() {}

  pub fn is_configured() {}

  pub fn configure(title: &str, description: &str, funding_goal: u128, min_deposit: u128) {}

  pub fn toString() {}

  // pub fn add_supporter(coordinates: &str) {}
  pub fn add_supporter() {}

  // pub fn list_supporters(): PersistentVector<Supporter>
  pub fn create_project() {}
  
  pub fn get_factory() {}
  pub fn get_funding() {}
}
