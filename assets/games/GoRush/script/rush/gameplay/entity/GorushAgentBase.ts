import { _decorator, Component, Node, SkeletalAnimation, AnimationState } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GorushAgentBase')
export class GorushAgentBase extends Component {
    static AnimNamePre_FlyLoop: string = "loop";

    @property(SkeletalAnimation)
    skeleton!: SkeletalAnimation;
    currentAnimState: AnimationState | null = null;

    protected animn_start: string = "start";
    protected animn_restart: string = "restart0";
    protected animn_takeoff: string = "takeoff";
    protected animn_retakeoff: string = "retakeoff0";
    protected toRestart: boolean = false;
    protected offAnimState: AnimationState | null = null;
    protected loopIdx: number = 0;

    get CurrentAnimationName(): string {
        return this.currentAnimState?.name ?? "";
    }
    get IsFlying(): boolean {
        let name = this.CurrentAnimationName;
        return name.startsWith(GorushAgentBase.AnimNamePre_FlyLoop);
    }
    get IsTakingOff(): boolean {
        let name = this.CurrentAnimationName;
        return name === this.animn_takeoff || name === this.animn_retakeoff;
    }

    protected onEnable() {
        // play skeleton.clips one by one
        this.loopPlay();
    }

    protected onDisable() {
        this.stopAnimate(true);
    }

    loopPlay() {
        let state = this.skeleton.getState(this.skeleton.clips[this.loopIdx].name);
        this.skeleton.play(state.name);
        this.loopIdx = (this.loopIdx + 1) % this.skeleton.clips.length; // next
        this.scheduleOnce(() => {
            if (!this.isValid || !this.node || !this.node.isValid || !this.node.activeInHierarchy) {
                return;
            }
            this.loopPlay();
        }, state.duration);
    }

    stayOff() {
        this.stopAnimate(true);
        if (this.offAnimState) {
            this.offAnimState.setTime(this.offAnimState.duration); // last frame
            this.offAnimState.sample();
        }
    }

    startLaunch(roundT: number, re: boolean) {
        this.toRestart = re;
        let anim = re ? this.animn_restart : this.animn_start;
        this.currentAnimState = this.skeleton.getState(anim);
        if (this.currentAnimState) {
            this.currentAnimState.speed = this.currentAnimState.duration / roundT;
        }
        this.skeleton.once(SkeletalAnimation.EventType.FINISHED, () => {
                if (!this.isValid || !this.currentAnimState ||
                    (this.currentAnimState.name !== this.animn_start && this.currentAnimState.name !== this.animn_restart)) {
                    return;
                }
                this.actRoundStart();
            }, this);
        //console.log(`[GoRush] ${this.node.name} actRoundStart: skin-animation=${this.currentAnimState.name}`);
        this.animate(anim);
    }

    actRoundStart() {
        if (!this.IsTakingOff) {
            let anim = this.toRestart ? this.animn_retakeoff : this.animn_takeoff;
            this.animate(anim);
        }
    }

    cleanupAnimationEvents() {
        this.skeleton.removeAll(SkeletalAnimation.EventType.LASTFRAME);
        this.skeleton.removeAll(SkeletalAnimation.EventType.FINISHED);
    }

    animate(ani: string, cross: number = 0) {
        this.currentAnimState = this.skeleton.getState(ani);
        //console.log(`[GoRush] ${this.node.name} animate: skin-animation=${this.currentAnimState.name}`);
        if (cross > 0) {
            this.skeleton.crossFade(ani, 0.05);
        }
        else {
            this.skeleton.play(ani);
        }
    }

    stopAnimate(cleanEvts: boolean = true) {
        if (cleanEvts) {
            this.cleanupAnimationEvents();
        }
        this.skeleton.stop();
        this.currentAnimState = null;
    }
}

