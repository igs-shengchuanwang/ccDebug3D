import { _decorator, Component, Node, SkeletalAnimation, Animation, AnimationState, math } from 'cc';
import { GorushAgentBase } from './GorushAgentBase';
const { ccclass, property } = _decorator;

@ccclass('ShuttleAgent')
export class ShuttleAgent extends GorushAgentBase {
    private animn_eject: string = "eject";
    private animn_explode: string = "explode";
    //private animn_result: string = "result";

    private animaAero: Animation | null = null;

    get IsFlying() {
        let name = this.CurrentAnimationName;
        return name === this.animn_eject || name.startsWith("loop");
    }

    protected onEnable() {
        super.onEnable();
        this.animaAero = this.getComponent(Animation);
        // not working as expected always
        // if (this.animaAero) {
        //     this.skeleton.on(SkeletalAnimation.EventType.PLAY, _ => {
        //         let state = this.animaAero.getState(this.CurrentAnimationName);
        //         console.log(`[GoRush] Rocket_ani: skin-animation=${this.CurrentAnimationName}; rocket-animation=${state?.name}`);
        //         if (state) { // exist
        //             this.animaAero.play(state.name);
        //         }
        //         else {
        //             this.animaAero.stop();
        //         }
        //     }, this);
        // }
        this.offAnimState = this.skeleton.getState(this.animn_explode);
    }

    stopAnimate(cleanEvts: boolean = true) {
        super.stopAnimate(cleanEvts);
        if (this.animaAero) {
            this.animaAero.stop();
        }
    }

    animate(ani: string, cross?: number): void {
        super.animate(ani, cross);
        if (this.animaAero) {
            let state = this.animaAero.getState(this.CurrentAnimationName);
            //console.log(`[GoRush] Rocket_ani: skin-animation=${this.CurrentAnimationName}; rocket-animation=${state?.name}`);
            if (state) { // exist
                this.animaAero.play(state.name);
            }
            else {
                this.animaAero.stop();
            }
        }
    }

    actExplosion() {
        this.cleanupAnimationEvents();
        this.animate(this.animn_explode, 0.1);
    }

    actEject() {
        // 'eject' NOT LOOP, 故需手動播放 loop_ 飛行動畫
        this.skeleton.once(SkeletalAnimation.EventType.FINISHED, () => {
                if (!this.isValid || !this.currentAnimState || this.currentAnimState.name !== this.animn_eject) {
                    return;
                }
                this.animate("loop0");
            }, this);
        this.animate(this.animn_eject, 0.1);
    }
}
