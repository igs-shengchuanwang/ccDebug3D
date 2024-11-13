import { _decorator, Component, Node, SkeletalAnimation, AnimationState } from 'cc';
import { GorushAgentBase } from './GorushAgentBase';
const { ccclass, property } = _decorator;

@ccclass('RobotAgent')
export class RobotAgent extends GorushAgentBase {
    static Interval_EjectGrabMs: number = 450;

    private animn_eject: string = "eject";
    private animn_explode: string = "explode";
    private animn_result: string = "result";

    get IsEjectWon() {
        return this.CurrentAnimationName === this.animn_eject;
    }

    protected onEnable() {
        super.onEnable();
        this.offAnimState = this.skeleton.getState(this.animn_explode);
    }

    actExplosion() {
        this.cleanupAnimationEvents();
        this.animate(this.animn_explode, 0.1);
    }

    actEject() {
        this.animate(this.animn_eject, 0.1);
    }

    actWinResult() {
        this.animate(this.animn_result, 0);
    }
}
