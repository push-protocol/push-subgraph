import { BigInt } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import {
  EPNSProxy,
  AdminChanged,
  Upgraded
} from "../generated/EPNSProxy/EPNSProxy"
import {
  EPNSCoreV3,
  Subscribe
} from "../generated/EPNSCoreV3/EPNSCoreV3"
import { Admin,Upgrade, User } from "../generated/schema"

export function handleAdminChanged(event: AdminChanged): void {
  let entity = Admin.load(event.transaction.from.toHex())
  if (entity == null) {
    entity = new Admin(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.previousAdmin = event.params.previousAdmin
  entity.newAdmin = event.params.newAdmin

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.admin(...)
  // - contract.implementation(...)
}

export function handleUpgraded(event: Upgraded): void {
  let upgrade = new Upgrade(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  upgrade.address = event.params.implementation
  log.info('Subscribe: {}', [
    event.params.implementation.toHexString(),
  ])

  upgrade.save()

}


