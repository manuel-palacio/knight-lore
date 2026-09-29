import type * as THREE from 'three'
import { deliveryEffect } from '../engine/effects'
import type { Beeper } from '../engine/Beeper'
import { Cauldron } from './Cauldron'
import { CHARM_HOVER, Pickup } from './Pickup'
import { headroomToLiftOnto, insideRoom } from './Placing'
import { touchesHazard } from './Hazards'
import type { GameState } from './GameState'
import type { Player } from './Player'
import type { Room } from './Room'

// What E does with charms: into the cauldron, else picked up, else put down.
export class CharmHands {
  constructor(private readonly player: Player, private readonly state: GameState, private readonly beeper: Beeper) {}

  use(room: Room): void {
    if (!this.deliver(room) && !this.pickUp(room)) this.putDown(room)
  }

  // The extra life (graphic 0x67, handler 0xC1AB) is taken by touching it,
  // not with E, which only picks up the charms (0xC172).
  takeLifeTouched(room: Room): void {
    const life = room.entities.find((e): e is Pickup => e instanceof Pickup && e.id === 'life' && !e.collected && touchesHazard(this.player, e))
    if (life) this.takeExtraLife(room, life)
  }

  private deliver(room: Room): boolean {
    const cauldron = room.entities.find((e): e is Cauldron => e instanceof Cauldron)
    if (!cauldron || !cauldron.isInRange(this.player.position)) return false
    const { satchel } = this.player
    const wanted = this.state.wantedItem
    const charm = wanted ? satchel.handOver(wanted) : undefined
    if (!charm || !this.state.deliverCureItem(charm.id)) {
      if (charm) satchel.take(charm)
      if (!satchel.isEmpty) this.beeper.play('wrong')
      return false
    }
    if (charm.spot !== null) this.state.usedSpots.push(charm.spot)
    if (this.state.won) this.beeper.play('win')
    else this.beeper.playEffect(deliveryEffect(charm.id))
    return true
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

  // Puts down the charm carried longest, under his feet: he stands on it, a
  // block higher (see Player).
  private putDown(room: Room): void {
    const feet = this.player.position.clone()
    const charm = this.player.putDownUnderFoot(this.hasHeadroom(room, feet))
    if (!charm) return
    this.lay(room, charm, feet)
    this.beeper.play('drop')
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
