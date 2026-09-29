import type * as THREE from 'three'
import { deliveryEffect, pushEffect } from '../engine/effects'
import type { Beeper } from '../engine/Beeper'
import { Cauldron, CAULDRON_TOP } from './Cauldron'
import { CHARM_HOVER, Pickup } from './Pickup'
import { SinkingCharm } from './SinkingCharm'
import { headroomToLiftOnto, insideRoom } from './Placing'
import { touchesHazard } from './Hazards'
import { EPS } from '../engine/epsilons'
import type { GameState } from './GameState'
import type { Player } from './Player'
import type { Room } from './Room'

// A room holds at most two charms on its floor (the object slots at 0x5C48
// and 0x5C68), and the cauldron's room one, its second slot being the
// sparkle over the cauldron (0xB8A9): with no slot free, E puts nothing down
// (0xC081).
const CHARMS_ON_A_FLOOR = 2
const CHARMS_BY_THE_CAULDRON = 1

// What E does with charms (0xC00E): picks one up, else puts one down; put
// down up on the cauldron, it goes into it.
export class CharmHands {
  constructor(private readonly player: Player, private readonly state: GameState, private readonly beeper: Beeper) {}

  use(room: Room): void {
    if (!this.pickUp(room)) this.putDown(room)
  }

  // While a charm goes into the cauldron he can do nothing (0xD022, 0x5BC4).
  delivering(room: Room): boolean {
    return room.entities.some((e) => e instanceof SinkingCharm)
  }

  // The extra life (graphic 0x67, handler 0xC1AB) is taken by touching it,
  // not with E, which only picks up the charms (0xC172).
  takeLifeTouched(room: Room): void {
    const life = room.entities.find((e): e is Pickup => e instanceof Pickup && e.id === 'life' && !e.collected && touchesHazard(this.player, e))
    if (life) this.takeExtraLife(room, life)
  }

  // A charm on its way into the cauldron glides with a sound (0xC232), and
  // once it has sunk to the floor the cauldron takes it (0xC245): the one it
  // wants next brews the cure, a wrong one is lost, gone from the castle.
  settleDeliveries(room: Room): void {
    for (const e of room.entities) {
      if (!(e instanceof SinkingCharm)) continue
      if (e.moved) this.beeper.playEffect(pushEffect(e.position, room.grid))
      if (e.sunk) this.takeIntoCauldron(room, e)
    }
  }

  private takeIntoCauldron(room: Room, sinking: SinkingCharm): void {
    room.remove(sinking)
    const { charm } = sinking
    if (charm.spot !== null) this.state.usedSpots.push(charm.spot)
    if (!this.state.deliverCureItem(charm.id)) return
    if (this.state.won) this.beeper.play('win')
    else this.beeper.playEffect(deliveryEffect(charm.id))
  }

  // A charm in reach is picked up; with his hands full, the charm carried
  // longest is left where the new one lay. True when there was a charm to pick up.
  private pickUp(room: Room): boolean {
    const charm = room.entities.find((e): e is Pickup => e instanceof Pickup && e.id !== 'life' && !e.collected && e.isWithinReachOf(this.player.position))
    if (!charm) return false
    const where = charm.position.clone().setY(charm.position.y - CHARM_HOVER)
    this.player.tryPickup(charm, (letGo) => {
      this.beeper.play('pickup')
      charm.collect()
      room.remove(charm)
      if (letGo) this.lay(room, letGo, where)
    })
    return true
  }

  private takeExtraLife(room: Room, life: Pickup): void {
    this.state.gainLife()
    if (life.spot !== null) this.state.usedSpots.push(life.spot)
    life.collect()
    room.remove(life)
    this.beeper.play('pickup')
  }

  // Puts down what is in the satchel's last slot under his feet (see Player),
  // where the room has a place for it.
  private putDown(room: Room): void {
    if (this.charmsOnTheFloor(room) >= this.floorRoom(room)) return
    const feet = this.player.position.clone()
    const charm = this.player.putDownUnderFoot(this.hasHeadroom(room, feet))
    this.beeper.play('drop')
    if (!charm) return
    const cauldron = room.entities.find((e): e is Cauldron => e instanceof Cauldron)
    if (cauldron && feet.y >= CAULDRON_TOP - EPS.STEP) this.dropIntoCauldron(room, charm, feet, cauldron)
    else this.lay(room, charm, feet)
  }

  private charmsOnTheFloor(room: Room): number {
    return room.entities.filter((e) => (e instanceof Pickup && !e.collected) || e instanceof SinkingCharm).length
  }

  private floorRoom(room: Room): number {
    return room.entities.some((e) => e instanceof Cauldron) ? CHARMS_BY_THE_CAULDRON : CHARMS_ON_A_FLOOR
  }

  private dropIntoCauldron(room: Room, charm: Pickup, at: THREE.Vector3, cauldron: Cauldron): void {
    charm.dropAt(at.x, at.y + CHARM_HOVER, at.z)
    room.add(new SinkingCharm(charm, cauldron.position))
  }

  private hasHeadroom(room: Room, feet: THREE.Vector3): boolean {
    return headroomToLiftOnto(room.entities.filter((e) => e !== this.player), this.player, feet)
  }

  private lay(room: Room, charm: Pickup, at: THREE.Vector3): void {
    const inside = insideRoom(at, room.grid, room.tileSize, charm.extents.x / 2)
    charm.dropAt(inside.x, at.y + CHARM_HOVER, inside.z)
    room.add(charm)
  }
}
