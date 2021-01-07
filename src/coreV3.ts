import { 
  BigInt,
  Bytes, 
  ipfs,
  json,
  JSONValueKind,
  log } from "@graphprotocol/graph-ts"
import {
  EPNSCoreV3,
  AddChannel,
  DeactivateChannel,
  Donation,
  InterestClaimed,
  PublicKeyRegistered,
  SendNotification,
  Subscribe,
  Unsubscribe,
  UpdateChannel,
  Withdrawal
} from "../generated/EPNSCoreV3/EPNSCoreV3"
import { 
  User, 
  Channel, 
  EPNS, 
  Notification,
  SubscriptionState
 } from "../generated/schema"

export const EPNS_ADDRESS = '0xb02E99b9634bD21A8e3E36cc7adb673287A8FeaC'

let ONE_BI = BigInt.fromI32(1)

export function handleAddChannel(event: AddChannel): void {

  let channel = new Channel(event.params.channel.toHexString())
  channel.subscribedCount = new BigInt(0)
  channel.unsubscribedCount =  new BigInt(0)
  channel.userCount =  new BigInt(0)
  channel.notificationCount =  new BigInt(0)

  channel.indexTimestamp =  event.block.timestamp
  channel.indexBlock = event.block.number

  channel.type = new BigInt(0)
  // channel.deactivated = false
  channel.poolContribution = new BigInt(0)
  channel.memberCount = new BigInt(0)
  channel.historicalZ = new BigInt(0)
  channel.fairShareCount = new BigInt(0)
  channel.lastUpdateBlock = new BigInt(0)
  channel.startBlock = new BigInt(0)
  channel.updateBlock = new BigInt(0)
  channel.weight = new BigInt(0)


  let contract = EPNSCoreV3.bind(event.address)
  let c = contract.try_channels(event.params.channel)

  if (c.reverted) {
    log.warning('.channels reverted', [])
  } else {
    channel.type =  BigInt.fromI32(c.value.value0)
    channel.deactivated = c.value.value1
    channel.poolContribution = c.value.value2
    channel.memberCount = c.value.value3
    channel.historicalZ = c.value.value4
    channel.fairShareCount = c.value.value5
    channel.lastUpdateBlock = c.value.value6
    channel.startBlock = c.value.value7
    channel.updateBlock = c.value.value8
    channel.weight = c.value.value9

  }

  log.warning('channel.poolContribution {} ', [channel.poolContribution.toString()])
  log.warning('channel.historicalZ {} ', [channel.historicalZ.toString()])
  log.warning('channel.fairShareCount {} ', [channel.fairShareCount.toString()])
  log.warning('channel.lastUpdateBlock {} ', [channel.lastUpdateBlock.toString()])
  log.warning('channel.startBlock {} ', [channel.startBlock.toString()])
  log.warning('channel.updateBlock {} ', [channel.updateBlock.toString()])
  log.warning('channel.weight {} ', [channel.weight.toString()])

  

  let result = ipfs.cat(getIpfsId(event.params.identity))!
  if (result) {
    let ipfsObject = json.fromBytes(result).toObject()
    channel.name = ipfsObject.get('name').toString()
    channel.info = ipfsObject.get('info').toString()
    channel.url = ipfsObject.get('url').toString()
    channel.icon = ipfsObject.get('icon').toString()
  } else {
    log.warning('channel identity not found in ipfs {}', [
      event.params.identity.toString(),
    ])
  }
  channel.activated = true
  channel.save()

  let epns = EPNS.load(EPNS_ADDRESS)
  if(epns === null)
  {
    epns = new EPNS(EPNS_ADDRESS)
    epns.channelCount = 0
    epns.userCount =  0
    epns.notificationCount =  0
  }
  epns.channelCount = epns.channelCount + 1
  epns.save()

}


export function handleUpdateChannel(event: UpdateChannel): void {
  let channel = Channel.load(event.params.channel.toHexString())
  if (channel === null) {
    log.warning('unknown channel {}', [event.params.channel.toHexString()])
    return
  }
  let result = ipfs.cat(event.params.identity.toString().split('+')[0])!
  if (result) {
    let ipfsObject = json.fromBytes(result).toObject()
    channel.name = ipfsObject.get('name').toString()
    channel.info = ipfsObject.get('info').toString()
    channel.url = ipfsObject.get('url').toString()
    channel.icon = ipfsObject.get('icon').toString()
  }

  // let contract = Contract.bind(event.address)
  // let c = contract.channels(event.params.channel)

  // channel.poolContribution = c.value2.toI32() as BigInt
  // channel.memberCount = c.value3.toI32() as BigInt
  // channel.historicalZ = c.value4.toI32() as BigInt
  // channel.fairShareCount = c.value5.toI32() as BigInt
  // channel.lastUpdateBlock = c.value6.toI32() as BigInt
  // channel.startBlock = c.value7.toI32() as BigInt
  // channel.updateBlock = c.value8.toI32() as BigInt
  // channel.weight = c.value9.toI32() as BigInt

  channel.save()
}

export function handleDeactivateChannel(event: DeactivateChannel): void {
  let channel = Channel.load(event.params.channel.toHexString())
  if (channel === null) {
    log.warning('unknown channel {}', [event.params.channel.toHexString()])
    return
  }
  channel.deactivated = true
  channel.save()
}


export function handleSubscribe(event: Subscribe): void {

  let user = User.load(event.params.channel.toHexString() + "-" + event.params.user.toHexString())
  if(user === null)
  {
    user = new User(event.params.channel.toHexString() + "-" + event.params.user.toHexString())
    user.user = event.params.user
    user.channel = event.params.channel
  }
  user.subscribed = true
  user.save()

  let channel = Channel.load(event.params.channel.toHexString())
  if(channel === null)
  {
    log.warning('unknown channel {}', [event.params.channel.toHexString()])
    return
  }
  channel.subscribedCount = channel.subscribedCount.plus(ONE_BI)
  channel.userCount = channel.userCount.plus(ONE_BI)

  let contract = EPNSCoreV3.bind(event.address)
  let c = contract.try_channels(event.params.channel)
  if (c.reverted) {
    log.warning('.channels reverted', [])
  } else {
    channel.memberCount = c.value.value3
  }


  channel.save()

  let epns = EPNS.load(EPNS_ADDRESS)
  if(epns === null)
  {
    epns = new EPNS(EPNS_ADDRESS)
    epns.channelCount = 0
    epns.userCount =  0
    epns.notificationCount =  0
  }
  epns.userCount = epns.userCount + 1
  epns.save()

  let subscriptionId = getSubscriptionStateId(
    event.params.channel.toHexString(),
    event.params.user.toHexString()
  )
  let subscription = SubscriptionState.load(subscriptionId)
  if (subscription == null) {
    subscription = new SubscriptionState(subscriptionId)
    subscription.channelAddress = event.params.channel
    subscription.userAddress = event.params.user
    subscription.indexTimestamp = event.block.timestamp
    subscription.indexBlock = event.block.number
  }
  subscription.subscribed = true
  subscription.save()
}

export function handleUnsubscribe(event: Unsubscribe): void {

  let user = User.load(event.params.channel.toHexString() + "-" + event.params.user.toHexString())
  if(user === null)
  {
    user = new User(event.params.channel.toHexString() + "-" + event.params.user.toHexString())
    user.user = event.params.user
    user.channel = event.params.channel
  }
  user.subscribed = false
  user.save()

  let channel = Channel.load(event.params.channel.toHexString())
  
  channel.unsubscribedCount = channel.unsubscribedCount.plus(ONE_BI)
  channel.userCount = channel.userCount.minus(ONE_BI)
  channel.save()

  let epns = EPNS.load(EPNS_ADDRESS)
  if(epns === null)
  {
    epns = new EPNS(EPNS_ADDRESS)
    epns.channelCount = 0
    epns.userCount =  0
    epns.notificationCount =  0
  }
  epns.userCount = epns.userCount - 1
  epns.save()

  let subscriptionId = getSubscriptionStateId(
    event.params.channel.toHexString(),
    event.params.user.toHexString()
  )
  let subscription = SubscriptionState.load(subscriptionId)
  if (subscription == null) {
    subscription = new SubscriptionState(subscriptionId)
    subscription.channelAddress = event.params.channel
    subscription.userAddress = event.params.user
    subscription.indexTimestamp = event.block.timestamp
    subscription.indexBlock = event.block.number
  }
  subscription.subscribed = false
  subscription.save()

}

export function handleSendNotification(event: SendNotification): void {

  let channel = Channel.load(event.params.channel.toHexString())
  
  channel.notificationCount = channel.notificationCount.plus(ONE_BI)
  channel.save()

  let epns = EPNS.load(EPNS_ADDRESS)
  if(epns === null)
  {
    epns = new EPNS(EPNS_ADDRESS)
    epns.channelCount = 0
    epns.userCount =  0
    epns.notificationCount =  0
  }
  epns.notificationCount = epns.notificationCount + 1
  epns.save()


  let type: string = '',
    secret: string = '',
    title: string = '',
    body: string = '',
    asub: string = '',
    amsg: string = '',
    acta: string = '',
    aimg: string = '',
    atime: string = ''

  let channelAddress = event.params.channel
  let identity = event.params.identity

  let result = ipfs.cat(getIpfsId(identity))!
  if (result) {
    let ipfsObject = json.fromBytes(result).toObject()
    let n = ipfsObject.get('notification').toObject()

    let nTitle = n.get('title')
    if (nTitle !== null) {
      title = nTitle.toString()
    }
    let nBody = n.get('body')
    if (nBody !== null) {
      body = nBody.toString()
    }

    let dValue = ipfsObject.get('data')
    if (dValue !== null) {
      let d = dValue.toObject()

      let dataType = d.get('type')
      if (dataType !== null) {
        if (dataType.kind === JSONValueKind.STRING) {
          type = dataType.toString()
        } else {
          log.warning('notification kind {} for {}', [
            dataType.kind.toString(),
            identity.toString(),
          ])
        }
      }
      let dataASub = d.get('asub')
      if (dataASub !== null) {
        asub = dataASub.toString()
      }
      let dataAMsg = d.get('amsg')
      if (dataAMsg !== null) {
        amsg = dataAMsg.toString()
      }
      let dataACta = d.get('acta')
      if (dataACta !== null) {
        acta = dataACta.toString()
      }
      let dataAImg = d.get('aimg')
      if (dataAImg !== null) {
        aimg = dataAImg.toString()
      }
      let dataATime = d.get('atime')
      if (dataATime !== null) {
        atime = dataATime.toString()
      }
    }
  } else {
    log.warning('notification identity not found in ipfs {}', [
      identity.toString(),
    ])
  }

  log.warning('found notification of type {} {}', [type, identity.toString()])

  let timestamp = event.block.timestamp
  let block = event.block.number

  if (type.includes('1')) {
    log.warning('indexing broadcast notification {} {}', [
      type,
      identity.toString(),
    ])
    let contract = EPNSCoreV3.bind(event.address)
    let c = contract.try_usersCount()
    if (c.reverted) {
      log.warning('.usersCount reverted', [])
    } else {
      for (let i = 0; i < c.value.toI32(); i++) {
        let d = contract.try_mapAddressUsers(BigInt.fromI32(i))
        if (d.reverted) {
          log.warning('.mapAddressUsers reverted %s', [i.toString()])
        } else {
          let userAddress = d.value
          let subscriptionId = getSubscriptionStateId(
            channelAddress.toHexString(),
            userAddress.toHexString()
          )
          let subscription = SubscriptionState.load(subscriptionId)
          if (subscription == null) {
            log.warning('subscription is null {} {}', [
              i.toString(),
              subscriptionId.toString(),
            ])
          } else if (!subscription.subscribed) {
            log.warning('subscription is not subscribed {} {}', [
              i.toString(),
              subscriptionId,
            ])
          } else {
            log.warning('create notification for: {} {} {}', [
              i.toString(),
              subscriptionId,
              identity.toString(),
            ])
            createNotification(
              timestamp,
              block,
              identity,
              channelAddress,
              userAddress,
              type,
              secret,
              title,
              body,
              asub,
              amsg,
              acta,
              aimg,
              atime
            )
          }
        }
      }
    }
  } else {
    log.warning('indexing single notification {} {}', [
      type,
      identity.toString(),
    ])
    createNotification(
      timestamp,
      block,
      identity,
      channelAddress,
      event.params.recipient,
      type,
      secret,
      title,
      body,
      asub,
      amsg,
      acta,
      aimg,
      atime
    )
  }
}


function createNotification(
  timestamp: BigInt,
  block: BigInt,

  identity: Bytes,
  channelAddress: Bytes,
  userAddress: Bytes,
  type: string,
  secret: string,
  title: string,
  body: string,
  asub: string,
  amsg: string,
  acta: string,
  aimg: string,
  atime: string
): void {
  let notification = new Notification(
    identity
      .toString()
      .concat('+')
      .concat(channelAddress.toHexString())
      .concat('+')
      .concat(userAddress.toHexString())
  )
  notification.indexTimestamp = timestamp
  notification.indexBlock = block

  notification.channelAddress = channelAddress
  notification.userAddress = userAddress

  notification.dataType = type
  notification.dataSecret = secret
  notification.notificationTitle = title
  notification.notificationBody = body
  notification.dataASub = asub
  notification.dataAMsg = amsg
  notification.dataACta = acta
  notification.dataAImg = aimg
  notification.dataATime = atime

  notification.save()
}

function getIpfsId(s: Bytes): string {
  return s.toString().split('+')[1]
}

function getSubscriptionStateId(channel: string, user: string): string {
  return channel.concat('+').concat(user)
}



export function handleDonation(event: Donation): void {}

export function handleInterestClaimed(event: InterestClaimed): void {}

export function handlePublicKeyRegistered(event: PublicKeyRegistered): void {}

export function handleWithdrawal(event: Withdrawal): void {}



