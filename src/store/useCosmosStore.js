import { create } from 'zustand';

const useCosmosStore = create((set) => ({
  time: new Date(),
  location: {
    lat: 34.0522, // Default: Los Angeles
    lon: -118.2437,
    name: 'Los Angeles, CA'
  },
  focusedStar: null,
  isPlaying: true,
  speed: 1.0, // Multiplier for time progression

  setTime: (newTime) => set({ time: newTime }),
  setLocation: (newLocation) => set({ location: newLocation }),
  setFocusedStar: (star) => set({ focusedStar: star }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),

  // Actions for playback
  playPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  fastForward: () => set((state) => ({ speed: Math.min(state.speed * 2, 10000) })), // Adjust max speed as needed
  rewind: () => set((state) => ({ speed: Math.max(state.speed / 2, -10000) })), // Adjust min speed as needed
}));

export default useCosmosStore;
